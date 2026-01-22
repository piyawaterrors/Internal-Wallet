import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/services/firebase";
import { addDocument, updateDocument } from "@/services/dbService";
import { sendPushMessage } from "@/services/lineService";
import {
  ChevronLeft,
  Banknote,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Building2,
  CreditCard,
  User,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { closeLiff } from "@/services/liff";

export default function WithdrawRequest({ profile, onBack }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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

      // ตรวจสอบทันทีว่าเงินเกินหรือไม่
      const numAmount = parseFloat(rawValue);
      if (numAmount > profile.credit) {
        setError("ยอดเครดิตไม่เพียงพอ");
      } else if (numAmount > 0) {
        setError(""); // Clear error if amount is valid
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(/,/g, ""));

    if (isNaN(numAmount) || numAmount <= 0) {
      setError("กรุณากรอกจำนวนเงินที่ถูกต้อง");
      return;
    }

    if (numAmount > profile.credit) {
      setError("ยอดเครดิตไม่เพียงพอ");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // สร้างคำขอถอนเงิน
      await addDocument("withdraw", {
        user_id: profile.line_user_id,
        amount: numAmount,
        bank_name: profile.bank_name,
        bank_number: profile.bank_number,
        status: "pending",
      });

      // หักเครดิตจาก profile ทันที
      await updateDocument("profiles", profile.line_user_id, {
        credit: profile.credit - numAmount,
      });

      // ส่งข้อความแจ้งเตือนผู้ใช้
      try {
        const messages = [
          {
            type: "text",
            text: `📤 คำขอถอนเครดิตของคุณได้รับการบันทึกแล้ว\n\nจำนวน: ${numAmount.toLocaleString()} ฿\nธนาคาร: ${profile.bank_name}\nเลขบัญชี: ${profile.bank_number}\n\nทีมงานจะตรวจสอบและโอนเงินภายใน 24 ชั่วโมง\n\nยอดเครดิตคงเหลือ: ${(profile.credit - numAmount).toLocaleString()} ฿`,
          },
        ];
        await sendPushMessage(profile.line_user_id, messages);
      } catch (pushError) {
        console.warn("⚠️ Could not send push message:", pushError.message);
      }

      setSuccess(true);
    } catch (error) {
      setError("ไม่สามารถส่งคำขอได้: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F5F7F9]">
        {/* Header */}
        <div className="bg-white px-6 py-4 flex items-center border-b border-slate-100">
          <h1 className="flex-1 text-center font-bold text-lg text-slate-800">
            ถอนเงิน
          </h1>
        </div>

        {/* Success Content */}
        <div className="flex-1 flex items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-24 h-24 bg-[#138141]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2
                size={56}
                className="text-[#138141]"
                strokeWidth={2.5}
              />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-3">
              ส่งคำขอสำเร็จ!
            </h3>
            <p className="text-slate-500 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
              ทีมงานจะตรวจสอบและโอนเงินเข้าบัญชีของคุณภายใน 24 ชั่วโมง
            </p>

            <Button
              onClick={closeLiff}
              className="py-6 px-8 rounded-2xl text-base font-black bg-[#138141] hover:bg-[#0e6332]"
            >
              เสร็จสิ้น
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7F9]">
      <div className="flex-1 overflow-y-auto pb-6">
        <div className="p-6 space-y-4">
          {/* Available Balance Card */}
          <div className="bg-gradient-to-br from-[#138141] to-[#0e6332] rounded-3xl p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <Wallet size={18} className="text-white/80" />
              <p className="text-xs font-bold text-white/80 uppercase tracking-wider">
                ยอดเครดิตที่สามารถถอนได้
              </p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-white">
                {profile.credit.toLocaleString()}
              </span>
              <span className="text-2xl font-bold text-white/80">฿</span>
            </div>
          </div>

          {/* Bank Account Info Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={18} className="text-[#138141]" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                บัญชีที่จะรับเงิน
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500 font-medium">
                  ธนาคาร
                </span>
                <span className="text-sm text-slate-900 font-bold">
                  {profile.bank_name}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500 font-medium">
                  เลขบัญชี
                </span>
                <span className="text-sm text-slate-900 font-mono font-bold">
                  {profile.bank_number}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-500 font-medium">
                  ชื่อบัญชี
                </span>
                <span className="text-sm text-slate-900 font-bold">
                  {profile.first_name} {profile.last_name}
                </span>
              </div>
            </div>
          </div>

          {/* Withdraw Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount Input */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">
                จำนวนเงินที่ต้องการถอน
              </Label>
              <div className="relative">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-4xl font-black text-slate-300">
                  ฿
                </span>
                <Input
                  autoFocus
                  variant="outline"
                  type="text"
                  inputMode="decimal"
                  value={formatWithCommas(amount)}
                  onChange={handleAmountChange}
                  placeholder="0"
                  className="h-16 text-4xl font-black pl-10 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-slate-900"
                  required
                />
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3"
                >
                  <AlertCircle
                    size={20}
                    className="text-red-500 flex-shrink-0 mt-0.5"
                  />
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <p className="text-xs text-blue-700 leading-relaxed">
                💡 <strong>หมายเหตุ:</strong> ระบบจะตรวจสอบคำขอถอนเงินภายใน 24
                ชั่วโมง และโอนเงินเข้าบัญชีที่ลงทะเบียนไว้
                กรุณาตรวจสอบข้อมูลบัญชีให้ถูกต้อง
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading || !amount}
              className="w-full py-7 rounded-2xl text-lg font-black bg-[#138141] hover:bg-[#0e6332] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <>
                  ส่งคำขอถอนเงิน
                  <Banknote size={20} className="ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Footer Branding */}
          <div className="flex justify-center items-center gap-2 text-slate-400 pt-4">
            <Wallet size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">
              Internal Wallet Service
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
