import { db } from "./services/firebase";
import { collection, getDocs } from "firebase/firestore";

// ทดสอบการเชื่อมต่อ
async function testConnection() {
  try {
    console.log("🔥 Testing Firebase connection...");
    const testCollection = collection(db, "profiles");
    const snapshot = await getDocs(testCollection);
    console.log("✅ Connection successful! Documents:", snapshot.size);
  } catch (error) {
    console.error("❌ Connection failed:", error);
  }
}

testConnection();
