import { useState, useEffect, useRef } from "react";
import {
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import { initializeLiff, getLiffProfile } from "@/services/liff";
import { getDocument } from "@/services/dbService";
import { Loader2 } from "lucide-react";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Transfer from "@/pages/Transfer";
import TransactionHistory from "@/pages/TransactionHistory";
import WithdrawRequest from "@/pages/WithdrawRequest";
import { initVConsole } from "@/services/vconsole";
import "./App.css";

// Initialize VConsole for mobile debugging
initVConsole();

function App() {
  const [loading, setLoading] = useState(true);
  const [liffUser, setLiffUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const initialized = useRef(false);

  useEffect(() => {
    // ป้องกันการเรียกซ้ำ (React Strict Mode จะเรียก 2 ครั้ง)
    if (initialized.current) return;
    initialized.current = true;

    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setLoading(true);

      await initializeLiff();

      const lineProfile = await getLiffProfile();
      if (!lineProfile) {
        return;
      }

      setLiffUser(lineProfile);

      const existingProfile = await checkUserProfile(lineProfile.userId);
      if (existingProfile) {
        setProfile(existingProfile);

        // ถ้ามีโปรไฟล์แล้วแต่พยายามเข้าหน้าลงทะเบียน ให้ส่งกลับหน้าแรก
        if (location.pathname === "/register") {
          navigate("/", { replace: true });
        }
      } else {
        // ถ้ายังไม่มีโปรไฟล์ ให้ไปหน้าลงทะเบียน
        if (location.pathname !== "/register") {
          navigate("/register", { replace: true });
        }
      }
    } catch (error) {
      console.error("❌ App initialization failed:", error);
      alert("ไม่สามารถเชื่อมต่อกับระบบได้: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันดึงข้อมูล Profile ตาม User ID
  const checkUserProfile = async (lineUserId) => {
    try {
      const data = await getDocument("profiles", lineUserId);
      return data;
    } catch (error) {
      console.error("❌ ค้นหาผิดพลาด:", error);
      throw error;
    }
  };

  const handleLogout = () => {
    if (confirm("คุณต้องการออกจากระบบหรือไม่?")) {
      window.location.reload();
    }
  };

  const handleNavigate = (view) => {
    navigate(`/${view}`);
  };

  const handleBackToDashboard = () => {
    navigate("/");
  };

  if (loading) {
    return (
      <div className="fixed inset-0 h-screen w-screen flex items-center justify-center bg-white overflow-hidden">
        <div className="text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
            <Loader2 className="animate-spin text-primary" size={40} />
          </div>
          <p className="text-slate-600 text-sm">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Routes>
        <Route
          path="/register"
          element={
            liffUser ? (
              <Register user={liffUser} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/"
          element={
            profile ? (
              <Dashboard
                profile={profile}
                onNavigate={handleNavigate}
                onLogout={handleLogout}
              />
            ) : (
              <Navigate to="/register" replace />
            )
          }
        />
        <Route
          path="/transfer"
          element={
            profile ? (
              <Transfer
                profile={profile}
                initialView="scan"
                onComplete={handleBackToDashboard}
                onCancel={handleBackToDashboard}
              />
            ) : (
              <Navigate to="/register" replace />
            )
          }
        />
        <Route
          path="/qr"
          element={
            profile ? (
              <Transfer
                profile={profile}
                initialView="receive"
                onComplete={handleBackToDashboard}
                onCancel={handleBackToDashboard}
              />
            ) : (
              <Navigate to="/register" replace />
            )
          }
        />
        <Route
          path="/history"
          element={
            profile ? (
              <TransactionHistory
                profile={profile}
                onBack={handleBackToDashboard}
              />
            ) : (
              <Navigate to="/register" replace />
            )
          }
        />
        <Route
          path="/withdraw"
          element={
            profile ? (
              <WithdrawRequest
                profile={profile}
                onBack={handleBackToDashboard}
              />
            ) : (
              <Navigate to="/register" replace />
            )
          }
        />
      </Routes>
    </div>
  );

  // Fallback
  return (
    <div className="fixed inset-0 h-screen w-screen flex items-center justify-center bg-white overflow-hidden">
      <div className="text-center">
        <p className="text-slate-600">เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง</p>
      </div>
    </div>
  );
}

export default App;
