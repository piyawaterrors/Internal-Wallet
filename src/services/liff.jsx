import liff from "@line/liff";

const liffId = import.meta.env.VITE_LINE_LIFF_ID;

if (!liffId) {
  throw new Error("Missing LINE LIFF ID. Please check your .env file.");
}

let isInitialized = false;

export const initializeLiff = async () => {
  if (isInitialized) {
    return liff;
  }

  try {
    await liff.init({ liffId });
    isInitialized = true;
    return liff;
  } catch (error) {
    console.error("❌ LIFF initialization failed:", error);
    throw error;
  }
};

export const getLiffProfile = async () => {
  try {
    if (!liff.isLoggedIn()) {
      liff.login();
      return null;
    }

    const profile = await liff.getProfile();
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      statusMessage: profile.statusMessage,
    };
  } catch (error) {
    console.error("❌ Failed to get LIFF profile:", error);
    throw error;
  }
};

export const closeLiff = () => {
  liff.closeWindow();
};

export default liff;
