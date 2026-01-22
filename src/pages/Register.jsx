import { useState } from "react";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import { db } from "@/services/firebase";
import { setDocument, getDocument } from "@/services/dbService";
import { closeLiff } from "@/services/liff";
import { toast } from "sonner";
import { linkRichMenuToUser, sendPushMessage } from "@/services/lineService";
import {
  User,
  Phone,
  Mail,
  Landmark,
  CreditCard,
  ChevronRight,
  Loader2,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function Register({ user }) {
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    // first_name: "อำพวา",
    // last_name: "สวนวิจิตร์",
    // phone_number: "091-829-6274",
    // email: "amphawa.s0967972557@gmail.com",
    // bank_name: "พร้อมเพย์",
    // bank_number: "0918296274",
    first_name: "ปิยวัฒน์",
    last_name: "เขมะวิริยะอนันต์",
    phone_number: "061-334-1312",
    email: "piyawaterror@gmail.com",
    bank_name: "KBank",
    bank_number: "0101587150",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const cleanPhoneNumber = formData.phone_number.replace(/-/g, "");

      const profileData = {
        line_user_id: user.userId,
        line_name: user.displayName,
        line_avatar: user.pictureUrl,
        ...formData,
        phone_number: cleanPhoneNumber, // Use cleaned phone number
        credit: 1000,
      };

      await setDocument("profiles", user.userId, profileData);
      const data = await getDocument("profiles", user.userId);

      if (data) {
        toast.success("สมัครบัญชีสำเร็จ!", {
          description: "ยินดีต้อนรับสู่ Internal Wallet",
          duration: 2000,
        });
        try {
          await linkRichMenuToUser(user.userId);
        } catch (lineError) {
          console.warn(
            "⚠️ Could not link Rich Menu (likely CORS):",
            lineError.message,
          );
        }

        try {
          const pushMessages = [
            {
              type: "text",
              text: `สวัสดีคุณ ${formData.first_name}! 🎉\nการลงทะเบียนสำเร็จแล้ว คุณสามารถเริ่มใช้งาน Wallet ได้เลยครับ`,
            },
          ];
          await sendPushMessage(user.userId, pushMessages);
        } catch (pushError) {
          console.warn("⚠️ Could not send push message:", pushError.message);
        }

        setTimeout(() => {
          closeLiff();
        }, 2000);
        setIsSuccess(true);
      }
    } catch (error) {
      toast.error("การลงทะเบียนล้มเหลว", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white p-6 overflow-hidden">
        {/* Animated Icon pointing to the top-right corner */}
        {/* <motion.div
          initial={{ opacity: 0, x: -20, y: 20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{
            repeat: Infinity,
            repeatType: "reverse",
            duration: 0.8,
            ease: "easeInOut",
          }}
          className="absolute top-2 right-12 text-primary bg-primary/10 p-3 rounded-full"
        >
          <ArrowUpRight size={48} strokeWidth={3} />
        </motion.div> */}

        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto"
          >
            <CheckCircle2 size={64} className="text-green-600" />
          </motion.div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-900">
              ลงทะเบียนสำเร็จ!
            </h2>
            <p className="text-xl font-bold text-primary animate-pulse">
              กรุณาปิดหน้านี้
            </p>
          </div>

          <p className="text-slate-500 text-sm max-w-[250px] mx-auto">
            คุณสามารถเข้าใช้งานกระเป๋าเงินได้ทันทีจากเมนูใน LINE
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-12 flex items-center justify-center bg-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="text-center">
            <div className="w-20 h-20 rounded-full border-2 border-primary p-1 mx-auto mb-4">
              <img
                src={user?.pictureUrl}
                alt="Profile"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <CardTitle className="text-2xl font-bold">
              ยินดีต้อนรับสู่ Internal Wallet
            </CardTitle>
            <CardDescription>
              กรุณากรอกข้อมูลเพื่อลงทะเบียนเข้าใช้งาน
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ชื่อจริง</Label>
                  <div className="relative">
                    <User
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      required
                      placeholder="ชื่อ"
                      className="pl-10"
                      value={formData.first_name}
                      onChange={(e) =>
                        setFormData({ ...formData, first_name: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>นามสกุล</Label>
                  <Input
                    required
                    placeholder="นามสกุล"
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>เบอร์โทรศัพท์</Label>
                <div className="relative">
                  <Phone
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    required
                    type="tel"
                    placeholder="0XX-XXX-XXXX"
                    className="pl-10"
                    value={formData.phone_number}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, ""); // Remove non-digits
                      if (value.length > 10) value = value.slice(0, 10);

                      // Format as 0XX-XXX-XXXX
                      if (value.length > 6) {
                        value =
                          value.slice(0, 3) +
                          "-" +
                          value.slice(3, 6) +
                          "-" +
                          value.slice(6);
                      } else if (value.length > 3) {
                        value = value.slice(0, 3) + "-" + value.slice(3);
                      }

                      setFormData({ ...formData, phone_number: value });
                    }}
                    maxLength={12}
                    pattern="^0[0-9]{2}-[0-9]{3}-[0-9]{4}$"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>อีเมล</Label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    required
                    type="email"
                    placeholder="example@mail.com"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="pt-4 space-y-4">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  ข้อมูลบัญชีธนาคาร
                </Label>

                <div className="space-y-2">
                  <Select
                    required
                    onValueChange={(value) =>
                      setFormData({ ...formData, bank_name: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <div className="flex items-center gap-3">
                        <Landmark size={16} className="text-muted-foreground" />
                        <SelectValue placeholder="เลือกธนาคาร" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PromptPay">
                        พร้อมเพย์ (PromptPay)
                      </SelectItem>
                      <SelectItem value="KBank">กสิกรไทย (KBank)</SelectItem>
                      <SelectItem value="SCB">ไทยพาณิชย์ (SCB)</SelectItem>
                      <SelectItem value="BBL">กรุงเทพ (BBL)</SelectItem>
                      <SelectItem value="KTB">กรุงไทย (KTB)</SelectItem>
                      <SelectItem value="Krungsri">
                        กรุงศรีอยุธยา (Krungsri)
                      </SelectItem>
                      <SelectItem value="ttb">ทหารไทยธนชาต (ttb)</SelectItem>
                      <SelectItem value="GSB">ออมสิน (GSB)</SelectItem>
                      <SelectItem value="UOB">ยูโอบี (UOB)</SelectItem>
                      <SelectItem value="BAAC">ธ.ก.ส. (BAAC)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative">
                  <CreditCard
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    required
                    placeholder="เลขบัญชีธนาคาร"
                    className="pl-10"
                    value={formData.bank_number}
                    onChange={(e) =>
                      setFormData({ ...formData, bank_number: e.target.value })
                    }
                  />
                </div>
              </div>

              <Button
                disabled={loading}
                type="submit"
                className="w-full py-6 rounded-xl font-semibold mt-6"
              >
                {loading ? <Loader2 className="animate-spin" /> : null}
                ลงทะเบียนตอนนี้
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
