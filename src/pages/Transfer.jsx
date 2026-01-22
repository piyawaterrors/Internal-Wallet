import { useState, useEffect } from "react";
import { db } from "@/services/firebase";
import { getDocument } from "@/services/dbService";
import { doc, runTransaction, collection } from "firebase/firestore";
import QRCode from "qrcode";
import { sendPushMessage } from "@/services/lineService";
import {
  Send,
  User as UserIcon,
  Loader2,
  ChevronLeft,
  AlertCircle,
  QrCode as QrIcon,
  Download,
  Share2,
  Wallet,
  ArrowDown,
  CheckCircle2,
  ArrowDownCircle,
} from "lucide-react";
import { listenToDocument } from "@/services/dbService";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import { initializeLiff, getLiffProfile, closeLiff } from "@/services/liff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

// K-Bank Inspired Colors
const KBANK_GREEN = "#138141";
const KBANK_LIGHT_GREEN = "#e8f5e9";

export default function Transfer({
  profile,
  onComplete,
  onCancel,
  initialView = "scan",
}) {
  const [view, setView] = useState(initialView); // scan, receive
  const [step, setStep] = useState("scan"); // scan, confirm, review, success
  const [receiver, setReceiver] = useState(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [credit, setCredit] = useState(profile?.credit || 0);
  const [transactionId, setTransactionId] = useState("");
  const [receivedNotification, setReceivedNotification] = useState(null);
  const [phoneInput, setPhoneInput] = useState("");

  const senderId = profile?.line_user_id;

  // Listen to credit changes and show notification when receiving money
  useEffect(() => {
    if (!profile) return;

    const unsubscribe = listenToDocument(
      "profiles",
      profile.line_user_id,
      (data) => {
        if (data) {
          const newCredit = data.credit;
          const oldCredit = credit;

          // ถ้า credit เพิ่มขึ้น = ได้รับเครดิต
          if (newCredit > oldCredit && oldCredit > 0) {
            const receivedAmount = newCredit - oldCredit;

            // แสดง notification
            setReceivedNotification({
              amount: receivedAmount,
              newBalance: newCredit,
            });

            // ซ่อน notification หลัง 5 วินาที
            setTimeout(() => {
              setReceivedNotification(null);
            }, 5000);
          }

          setCredit(newCredit);
        }
      },
    );

    return () => unsubscribe();
  }, [profile, credit]);

  const formatWithCommas = (value) => {
    if (!value) return "";
    const parts = value.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  };

  const handleAmountChange = (e) => {
    const rawValue = e.target.value.replace(/,/g, "");
    if (/^\d*\.?\d{0,2}$/.test(rawValue) || rawValue === "") {
      setAmount(rawValue);
    }
  };

  useEffect(() => {
    if (view === "receive") {
      generateQR();
    }
  }, [view, profile]);

  const generateQR = async () => {
    try {
      const dataUrl = await QRCode.toDataURL(profile.line_user_id, {
        width: 300,
        margin: 2,
        color: {
          dark: KBANK_GREEN,
          light: "#FFFFFF",
        },
      });
      setQrDataUrl(dataUrl);
    } catch (error) {
      console.error("Failed to generate QR code:", error);
    }
  };

  const handleScan = async () => {
    try {
      setLoading(true);
      setError("");

      await initializeLiff();

      // Log LIFF status
      const liffStatus = {
        isLoggedIn: liff.isLoggedIn(),
        isInClient: liff.isInClient(),
        os: liff.getOS(),
        version: liff.getVersion(),
        scanCodeV2Available: liff.isApiAvailable("scanCodeV2"),
        scanCodeAvailable: liff.isApiAvailable("scanCode"),
      };

      let result;

      try {
        result = await liff.scanCodeV2();
      } catch (v2Error) {
        console.error("❌ [SCAN] scanCodeV2 failed:", {
          message: v2Error.message,
          name: v2Error.name,
          stack: v2Error.stack,
        });

        result = await liff.scanCode();
      }

      if (result && result.value) {
        await lookupReceiver(result.value);
      }
    } catch (error) {
      console.error("❌ [SCAN] Fatal error:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });

      // จัดการ error messages ต่างๆ
      if (error.name === "AbortError" || error.message.includes("aborted")) {
        setError(""); // Clear error
      } else if (error.message.includes("not allowed")) {
        setError(
          "ฟังก์ชันสแกนยังไม่ได้เปิดใช้งาน\n\nกรุณาตรวจสอบการตั้งค่า LIFF\nหรือใช้การกรอกรหัส User ID แทน",
        );
      } else if (
        error.message.includes("cancelled") ||
        error.message.includes("canceled")
      ) {
        setError("");
      } else {
        setError(error.message || "ไม่สามารถเปิดกล้องสแกนได้");
      }
    } finally {
      setLoading(false);
    }
  };

  const lookupReceiver = async (phoneNumber) => {
    try {
      // ลบ - และช่องว่างออกจากเบอร์โทรศัพท์
      const cleanPhone = phoneNumber.replace(/[-\s]/g, "");

      if (!cleanPhone || cleanPhone.length < 9) {
        throw new Error("กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง");
      }

      // Query Firestore เพื่อหาผู้ใช้จากเบอร์โทรศัพท์
      const { collection, query, where, getDocs } =
        await import("firebase/firestore");
      const profilesRef = collection(db, "profiles");
      const q = query(profilesRef, where("phone_number", "==", cleanPhone));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("ไม่พบผู้ใช้ที่มีเบอร์โทรศัพท์นี้ในระบบ");
      }

      const receiverDoc = querySnapshot.docs[0];
      const receiverData = { ...receiverDoc.data(), id: receiverDoc.id };

      if (receiverDoc.id === senderId) {
        throw new Error("ไม่สามารถโอนเครดิตให้ตัวเองได้");
      }

      setReceiver(receiverData);
      setStep("confirm");
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTransfer = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("กรุณากรอกจำนวนเครดิตที่ถูกต้อง");
      return;
    }

    setLoading(true);
    try {
      const tid = Math.random().toString(36).substr(2, 9).toUpperCase();
      setTransactionId(tid);

      await runTransaction(db, async (transaction) => {
        const senderRef = doc(db, "profiles", senderId);
        const receiverRef = doc(db, "profiles", receiver.line_user_id);
        const transactionRef = doc(collection(db, "transactions"));

        const senderDoc = await transaction.get(senderRef);
        if (!senderDoc.exists()) throw new Error("ไม่พบข้อมูลผู้โอน");

        const senderData = senderDoc.data();
        if (senderData.credit < numAmount) {
          throw new Error("ยอดเครดิตไม่เพียงพอ");
        }

        const receiverDoc = await transaction.get(receiverRef);
        if (!receiverDoc.exists()) throw new Error("ไม่พบข้อมูลผู้รับ");
        const receiverData = receiverDoc.data();

        transaction.update(senderRef, {
          credit: senderData.credit - numAmount,
        });
        transaction.update(receiverRef, {
          credit: receiverData.credit + numAmount,
        });

        transaction.set(transactionRef, {
          transaction_id: tid,
          sender_id: senderId,
          sender_name: `${senderData.first_name} ${senderData.last_name}`,
          sender_avatar: senderData.line_avatar || null,
          receiver_id: receiver.line_user_id,
          receiver_name: `${receiverData.first_name} ${receiverData.last_name}`,
          receiver_avatar: receiverData.line_avatar || null,
          amount: numAmount,
          created_at: dayjs().format("YYYY-MM-DD HH:mm:ss"),
          type: "transfer",
        });
      });

      // ส่งข้อความแจ้งเตือนให้ผู้ส่ง
      try {
        const senderMessages = [
          {
            type: "text",
            text: `✅ โอนเครดิตสำเร็จ\n\nจำนวน: ${numAmount.toLocaleString()} ฿\nถึง: ${receiver.first_name} ${receiver.last_name}\n\nยอดคงเหลือ: ${(credit - numAmount).toLocaleString()} ฿`,
          },
        ];
        await sendPushMessage(senderId, senderMessages);
      } catch (pushError) {
        console.warn(
          "⚠️ Could not send push message to sender:",
          pushError.message,
        );
      }

      // ส่งข้อความแจ้งเตือนให้ผู้รับ
      try {
        const receiverMessages = [
          {
            type: "text",
            text: `💰 คุณได้รับเครดิต ${numAmount.toLocaleString()} ฿\n\nจาก: ${profile.first_name} ${profile.last_name}\n\nยอดคงเหลือใหม่: ${(receiver.credit + numAmount).toLocaleString()} ฿`,
          },
        ];
        await sendPushMessage(receiver.line_user_id, receiverMessages);
      } catch (pushError) {
        console.warn(
          "⚠️ Could not send push message to receiver:",
          pushError.message,
        );
      }

      setStep("success");
    } catch (err) {
      setError(err.message);
      console.error("Transfer error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7F9]">
      {/* Received Money Notification Modal */}
      <AnimatePresence>
        {receivedNotification && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setReceivedNotification(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
            >
              <div className="text-center">
                <div className="w-20 h-20 bg-[#138141]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ArrowDownCircle
                    size={48}
                    className="text-[#138141]"
                    strokeWidth={2.5}
                  />
                </div>

                <h3 className="text-2xl font-black text-slate-900 mb-2">
                  ได้รับเครดิตแล้ว!
                </h3>

                <div className="my-6">
                  <p className="text-sm text-slate-500 mb-2">
                    จำนวนเครดิตที่ได้รับ
                  </p>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-5xl font-black text-[#138141]">
                      +{receivedNotification.amount.toLocaleString()}
                    </span>
                    <span className="text-2xl font-bold text-slate-400">฿</span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">ยอดคงเหลือใหม่</span>
                    <span className="font-bold text-slate-900">
                      {receivedNotification.newBalance.toLocaleString()} ฿
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => setReceivedNotification(null)}
                  className="w-full py-6 rounded-2xl text-base font-black bg-[#138141] hover:bg-[#0e6332]"
                >
                  รับทราบ
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header with K-Bank Style */}
      {(step === "confirm" || step === "review") && (
        <div className="bg-white px-6 py-4 flex items-center border-b border-slate-100">
          <h1 className="flex-1 text-center font-bold text-lg text-slate-800 -ml-8">
            {step === "confirm" ? "โอนเครดิต" : "ตรวจสอบข้อมูล"}
          </h1>
        </div>
      )}

      {step === "scan" && (
        <div className="p-6 bg-white border-b border-slate-100">
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setView("scan")}
              className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${
                view === "scan"
                  ? "bg-white text-[#138141] shadow-sm"
                  : "text-slate-500"
              }`}
            >
              โอนเครดิต
            </button>
            <button
              onClick={() => setView("receive")}
              className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${
                view === "receive"
                  ? "bg-white text-[#138141] shadow-sm"
                  : "text-slate-500"
              }`}
            >
              รับเครดิต
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {view === "scan" ? (
            <div key="scan-view">
              {step === "scan" && (
                <motion.div
                  key="scan"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-6 space-y-8"
                >
                  <div className="text-center py-10">
                    <div className="w-24 h-24 bg-[#e8f5e9] rounded-full flex items-center justify-center mx-auto mb-6 text-[#138141]">
                      <QrIcon size={48} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                      สแกน QR Code
                    </h3>
                    <p className="text-slate-500 text-sm">
                      สแกนเพื่อโอนเครดิตได้ทันที
                    </p>
                  </div>

                  <Button
                    onClick={handleScan}
                    disabled={loading}
                    className="w-full py-7 rounded-2xl text-lg font-bold bg-[#138141] hover:bg-[#0e6332] shadow-lg shadow-green-900/10"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      "สแกน QR Code"
                    )}
                  </Button>

                  <div className="relative flex items-center gap-4 py-4">
                    <div className="flex-1 h-px bg-slate-200"></div>
                    <span className="text-md text-slate-400 font-bold">
                      หรือใช้เบอร์โทรศัพท์
                    </span>
                    <div className="flex-1 h-px bg-slate-200"></div>
                  </div>

                  <div className="space-y-4">
                    {error && (
                      <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm">
                        <AlertCircle size={18} />
                        {error}
                      </div>
                    )}
                    <div className="flex gap-3">
                      <Input
                        type="tel"
                        placeholder="ระบุหมายเลขโทรศัพท์"
                        maxLength={10}
                        value={phoneInput}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          setPhoneInput(value);
                        }}
                        className="flex-1 h-14 bg-white border-slate-200 rounded-xl text-center text-lg font-bold"
                        onKeyDown={(e) =>
                          e.key === "Enter" &&
                          phoneInput.length === 10 &&
                          lookupReceiver(phoneInput)
                        }
                      />
                      <Button
                        onClick={() => lookupReceiver(phoneInput)}
                        disabled={phoneInput.length !== 10}
                        className="h-14 px-8 rounded-xl text-base font-black bg-[#138141] hover:bg-[#0e6332] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ถัดไป
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === "confirm" && (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-6 space-y-6"
                >
                  {/* From -> To Flow Interface */}
                  <div className="bg-white rounded-3xl p-6 shadow-sm space-y-8 relative">
                    {/* From Section */}
                    <div className="flex items-start gap-4 z-20">
                      <img
                        src={profile.line_avatar}
                        className="w-16 h-16 rounded-full border border-slate-100"
                      />
                      <div className="flex-1">
                        <p className="text-lg font-bold text-slate-400 uppercase mb-0.5">
                          จาก
                        </p>
                        <p className="text-lg font-bold text-slate-900">
                          {profile.first_name} {profile.last_name}
                        </p>
                        <p className="text-xs text-slate-400">
                          เครดิตคงเหลือ: ฿{credit.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Vertical Connecting Line */}
                    <div className="absolute left-14 z-10 top-22 bottom-6 w-px border-l-2 h-10 border-dashed border-slate-100"></div>

                    {/* To Section */}
                    <div className="flex items-start gap-4 z-20">
                      <img
                        src={receiver.line_avatar}
                        className="w-16 h-16 rounded-full border border-slate-100"
                      />
                      <div>
                        <p className="text-lg font-bold text-slate-400 uppercase mb-0.5">
                          ถึง
                        </p>
                        <p className="text-lg font-bold text-slate-900">
                          {receiver.first_name} {receiver.last_name}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Amount Input Section */}
                  <div className="bg-white rounded-3xl p-8 shadow-sm text-center space-y-2">
                    <p className="text-md font-bold text-slate-900 uppercase tracking-widest">
                      ระบุจำนวนเครดิต
                    </p>
                    <div className="relative inline-block w-full">
                      <Input
                        autoFocus
                        type="text"
                        inputMode="decimal"
                        value={formatWithCommas(amount)}
                        onChange={handleAmountChange}
                        placeholder="0.00"
                        className="h-24 border-none shadow-none !text-5xl !font-black text-center text-[#138141] placeholder:text-slate-100 focus-visible:ring-0"
                      />
                    </div>
                    {error && (
                      <p className="text-red-600 text-xs font-medium flex items-center justify-center gap-1">
                        <AlertCircle size={12} /> {error}
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={() => {
                      const numAmount = parseFloat(amount);
                      if (isNaN(numAmount) || numAmount <= 0) {
                        setError("กรุณากรอกจำนวนเครดิตที่ถูกต้อง");
                        return;
                      }
                      if (credit < numAmount) {
                        setError("ยอดเครดิตไม่เพียงพอ");
                        return;
                      }
                      setStep("review");
                      setError("");
                    }}
                    disabled={!amount || loading}
                    className="w-full py-7 rounded-2xl text-lg font-bold bg-[#138141] hover:bg-[#0e6332] shadow-lg shadow-green-900/10"
                  >
                    ต่อไป
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => {
                      setStep("scan");
                      setReceiver(null);
                      setAmount("");
                      setError("");
                      setTransactionId("");
                    }}
                    className="w-full py-7 rounded-2xl text-lg text-slate-500 font-bold hover:bg-slate-200"
                  >
                    ยกเลิก
                  </Button>
                </motion.div>
              )}

              {step === "review" && (
                <motion.div
                  key="review"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-6 space-y-6"
                >
                  <Card className="bg-white rounded-3xl border-none shadow-sm overflow-hidden">
                    <CardContent className="p-0">
                      <div className="pr-6 pl-6 pb-6 space-y-8">
                        {/* Transaction Detail Flow */}
                        <div className="space-y-10 relative">
                          <div className="flex items-start gap-4 z-20">
                            <img
                              src={profile.line_avatar}
                              className="w-16 h-16 rounded-full border border-slate-100"
                            />
                            <div>
                              <p className="text-lg font-bold text-slate-400 uppercase mb-0.5">
                                จาก
                              </p>
                              <p className="text-lg font-bold text-slate-900">
                                {profile.first_name} {profile.last_name}
                              </p>
                            </div>
                          </div>

                          <div className="absolute left-8 z-10 top-16 bottom-6 w-px border-l-2 border-dashed border-slate-100"></div>

                          <div className="flex items-start gap-4 z-20">
                            <img
                              src={receiver.line_avatar}
                              className="w-16 h-16 rounded-full border border-slate-100"
                            />
                            <div>
                              <p className="text-lg font-bold text-slate-400 uppercase mb-0.5">
                                ถึง
                              </p>
                              <p className="text-lg font-bold text-slate-900">
                                {receiver.first_name} {receiver.last_name}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="pt-6 border-t border-slate-50 space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500 font-bold">
                              จำนวนเครดิต
                            </span>
                            <span className="text-xl font-black text-slate-900">
                              ฿{parseFloat(amount).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500 font-bold">
                              ค่าธรรมเนียม
                            </span>
                            <span className="text-sm text-[#138141] font-bold">
                              ฟรี
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 bg-slate-50 flex justify-between items-center border-t border-slate-100">
                        <span className="text-sm font-bold text-slate-800">
                          ยอดรวม
                        </span>
                        <span className="text-2xl font-black text-[#138141]">
                          ฿{parseFloat(amount).toLocaleString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Button
                    onClick={handleTransfer}
                    disabled={loading}
                    className="w-full py-7 rounded-2xl text-lg font-bold bg-[#138141] hover:bg-[#0e6332] shadow-lg shadow-green-900/10"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      "ยืนยันการโอน"
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setStep("confirm")}
                    disabled={loading}
                    className="w-full py-7 rounded-2xl text-lg text-slate-500 font-bold hover:bg-slate-200"
                  >
                    ย้อนกลับ
                  </Button>
                </motion.div>
              )}

              {step === "success" && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6"
                >
                  <div className="bg-white rounded-3xl overflow-hidden shadow-xl">
                    {/* Slip Header */}
                    <div className="bg-[#138141] p-8 text-center text-white space-y-2">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 size={40} className="text-white" />
                      </div>
                      <h2 className="text-2xl font-black">โอนเครดิตสำเร็จ</h2>
                      <p className="text-white/80 font-bold">
                        {dayjs().format("D/MM/YYYY, HH:mm")}
                      </p>
                    </div>

                    <div className="p-6 space-y-8 bg-white relative">
                      {/* From - To Slip Style */}
                      <div className="space-y-8">
                        <div className="flex items-start gap-4 z-20">
                          <img
                            src={profile.line_avatar}
                            className="w-16 h-16 rounded-full border border-slate-100"
                          />
                          <div>
                            <p className="text-lg font-bold text-slate-400 uppercase mb-0.5">
                              จาก
                            </p>
                            <p className="text-lg font-bold text-slate-900">
                              {profile.first_name} {profile.last_name}
                            </p>
                          </div>
                        </div>

                        <div className="absolute left-14 z-10 top-22 bottom-6 w-1 h-8 border-l-2 border-dashed border-slate-100"></div>

                        <div className="flex items-start gap-4 z-20">
                          <img
                            src={receiver.line_avatar}
                            className="w-16 h-16 rounded-full border border-slate-100"
                          />
                          <div>
                            <p className="text-lg font-bold text-slate-400 uppercase mb-0.5">
                              ถึง
                            </p>
                            <p className="text-lg font-bold text-slate-900">
                              {receiver.first_name} {receiver.last_name}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-slate-100 space-y-4">
                        <div className="flex justify-between items-center text-sm font-bold">
                          <span className="text-slate-400">เลขที่รายการ:</span>
                          <span className="text-slate-900">
                            {transactionId}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-400">
                            จำนวนเครดิต:
                          </span>
                          <span className="text-2xl font-black text-[#138141]">
                            ฿{parseFloat(amount).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      closeLiff();
                    }}
                    className="w-full mt-10 py-7 text-lg rounded-2xl font-black bg-[#138141] hover:bg-[#0e6332]"
                  >
                    เสร็จสิ้น
                  </Button>
                </motion.div>
              )}
            </div>
          ) : (
            <motion.div
              key="receive-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 sm:p-6 text-center"
            >
              <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-50 space-y-6 sm:space-y-8 max-w-md mx-auto">
                <div className="space-y-2">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                    รับเครดิต
                  </h3>
                  <p className="text-sm text-slate-500 font-medium">
                    สแกน QR Code นี้เพื่อรับเครดิต
                  </p>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-3xl inline-block shadow-inner-lg border-2 border-slate-50">
                  {qrDataUrl && (
                    <img
                      src={qrDataUrl}
                      alt="QR"
                      className="w-48 h-48 sm:w-64 sm:h-64 mx-auto"
                    />
                  )}
                </div>

                <div className="bg-slate-50 w-full p-4 rounded-2xl flex items-center gap-3">
                  <img
                    src={profile.line_avatar}
                    className="w-10 h-10 rounded-full border-2 border-white flex-shrink-0"
                  />
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase">
                      ชื่อบัญชี
                    </p>
                    <p className="font-bold text-base sm:text-lg text-slate-800 truncate">
                      {profile.first_name} {profile.last_name}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-center items-center gap-2 text-slate-400">
                <Wallet size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Internal Wallet Service
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
