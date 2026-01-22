import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { db } from "@/services/firebase";
import { listenToDocument, updateDocument } from "@/services/dbService";
import { toast } from "sonner";
import {
  Wallet,
  User,
  Phone,
  Mail,
  Building2,
  CreditCard,
  Save,
  Loader2,
  CheckCircle2,
  Landmark,
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

export default function Dashboard({ profile, onNavigate, onLogout }) {
  const [credit, setCredit] = useState(profile?.credit || 0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: profile?.first_name || "",
    last_name: profile?.last_name || "",
    phone_number: profile?.phone_number || "",
    bank_name: profile?.bank_name || "",
    bank_number: profile?.bank_number || "",
  });

  useEffect(() => {
    if (!profile) return;

    // Subscribe to real-time credit updates
    const unsubscribe = listenToDocument(
      "profiles",
      profile.line_user_id,
      (data) => {
        if (data) {
          setCredit(data.credit);
        }
      },
    );

    return () => {
      unsubscribe();
    };
  }, [profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateDocument("profiles", profile.line_user_id, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone_number: formData.phone_number,
        bank_name: formData.bank_name,
        bank_number: formData.bank_number,
      });

      toast.success("บันทึกข้อมูลสำเร็จ!", {
        description: "ข้อมูลของคุณได้รับการอัพเดทแล้ว",
        duration: 3000,
      });
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("ไม่สามารถบันทึกข้อมูลได้", {
        description: error.message,
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7F9]">
      {/* Header */}
      <div className="bg-white px-6 py-4 border-b border-slate-100">
        <h1 className="text-center font-bold text-lg text-slate-800">
          ข้อมูลส่วนตัว
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-6">
        <div className="p-6 space-y-4">
          {/* Credit Balance Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="bg-gradient-to-br from-[#138141] to-[#0e6332] rounded-3xl p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <Wallet size={18} className="text-white/80" />
                <p className="text-xs font-bold text-white/80 uppercase tracking-wider">
                  ยอดเครดิตคงเหลือ
                </p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-white">
                  {credit.toLocaleString()}
                </span>
                <span className="text-2xl font-bold text-white/80">฿</span>
              </div>
            </div>
          </motion.div>

          {/* Profile Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Editable Fields */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                แก้ไขข้อมูลส่วนตัว
              </h3>

              <div className="space-y-4">
                {/* First Name */}
                <div>
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                    ชื่อ
                  </Label>
                  <div className="relative">
                    <User
                      size={20}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <Input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          first_name: e.target.value,
                        })
                      }
                      placeholder="ชื่อ"
                      className="pl-12 h-14 border-slate-200 rounded-2xl text-base font-bold"
                      required
                    />
                  </div>
                </div>

                {/* Last Name */}
                <div>
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                    นามสกุล
                  </Label>
                  <div className="relative">
                    <User
                      size={20}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <Input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          last_name: e.target.value,
                        })
                      }
                      placeholder="นามสกุล"
                      className="pl-12 h-14 border-slate-200 rounded-2xl text-base font-bold"
                      required
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                    เบอร์โทรศัพท์
                  </Label>
                  <div className="relative">
                    <Phone
                      size={20}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <Input
                      type="tel"
                      value={formData.phone_number}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          phone_number: e.target.value,
                        })
                      }
                      placeholder="0XX-XXX-XXXX"
                      className="pl-12 h-14 border-slate-200 rounded-2xl text-base font-bold"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                    อีเมล
                  </Label>
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                    <Mail size={20} className="text-slate-400" />
                    <span className="text-base font-bold text-slate-500">
                      {profile?.email}
                    </span>
                  </div>
                </div>

                {/* Bank Name */}
                <div>
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                    ธนาคาร
                  </Label>
                  <Select
                    value={formData.bank_name}
                    onValueChange={(value) =>
                      setFormData({ ...formData, bank_name: value })
                    }
                    required
                  >
                    <SelectTrigger className="w-full h-14 pl-12 border-slate-200 rounded-2xl text-base font-bold">
                      <div className="flex items-center gap-3 relative">
                        <Landmark
                          size={20}
                          className="absolute left-[-30px] top-1/2 -translate-y-1/2 text-slate-400"
                        />
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

                {/* Bank Number */}
                <div>
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                    เลขบัญชี
                  </Label>
                  <div className="relative">
                    <CreditCard
                      size={20}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <Input
                      type="text"
                      value={formData.bank_number}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bank_number: e.target.value,
                        })
                      }
                      placeholder="เลขบัญชีธนาคาร"
                      className="pl-12 h-14 border-slate-200 rounded-2xl text-base font-bold"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full py-7 rounded-2xl text-lg font-black bg-[#138141] hover:bg-[#0e6332] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <>
                  <Save size={20} className="mr-2" />
                  บันทึกข้อมูล
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
