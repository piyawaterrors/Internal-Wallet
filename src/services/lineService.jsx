import axios from "axios";

const ACCESS_TOKEN = import.meta.env.VITE_LINE_CHANNEL_ACCESS_TOKEN;
const RICH_MENU_ID = import.meta.env.VITE_RICH_MENU_ID;

const lineApi = axios.create({
  baseURL: "/line-api",
  headers: {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  },
});

export const linkRichMenuToUser = async (userId) => {
  if (!userId) throw new Error("User ID is required");

  try {
    const response = await lineApi.post(
      `/v2/bot/user/${userId}/richmenu/${RICH_MENU_ID}`,
    );
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || "Failed to link rich menu";
    console.error("❌ Link Rich Menu Error:", message);
    throw new Error(message);
  }
};

export const sendPushMessage = async (userId, messages) => {
  if (!userId || !messages)
    throw new Error("User ID and messages are required");

  try {
    // สร้าง retry key ใหม่ทุกครั้งที่ส่งข้อความ
    const retryKey = crypto.randomUUID();

    const response = await lineApi.post(
      "/v2/bot/message/push",
      {
        to: userId,
        messages: messages,
      },
      {
        headers: {
          "X-Line-Retry-Key": retryKey,
        },
      },
    );

    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message;
    console.error("❌ Push Message Error:", message);
    throw new Error(message);
  }
};
