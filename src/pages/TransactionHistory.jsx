import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import { db } from "@/services/firebase";
import { getCollection } from "@/services/dbService";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  or,
} from "firebase/firestore";
import {
  ChevronLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Filter,
  Loader2,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TransactionHistory({ profile, onBack }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, sent, received
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    fetchTransactions();
  }, [filter, page]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);

      let data = [];

      if (filter === "sent") {
        // Query sent transactions only (no orderBy to avoid index)
        const constraints = [
          where("sender_id", "==", profile.line_user_id),
          limit(ITEMS_PER_PAGE * 2), // Get more to ensure we have enough after sorting
        ];
        data = await getCollection("transactions", constraints);
      } else if (filter === "received") {
        // Query received transactions only (no orderBy to avoid index)
        const constraints = [
          where("receiver_id", "==", profile.line_user_id),
          limit(ITEMS_PER_PAGE * 2),
        ];
        data = await getCollection("transactions", constraints);
      } else {
        // Query both sent and received separately
        const sentConstraints = [
          where("sender_id", "==", profile.line_user_id),
          limit(ITEMS_PER_PAGE),
        ];
        const receivedConstraints = [
          where("receiver_id", "==", profile.line_user_id),
          limit(ITEMS_PER_PAGE),
        ];

        const [sentData, receivedData] = await Promise.all([
          getCollection("transactions", sentConstraints),
          getCollection("transactions", receivedConstraints),
        ]);

        data = [...sentData, ...receivedData];
      }

      // Sort by created_at in JavaScript
      data.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at) : new Date();
        const dateB = b.created_at ? new Date(b.created_at) : new Date();
        return dateB - dateA;
      });

      // Limit results
      data = data.slice(0, ITEMS_PER_PAGE);

      const formattedData = data.map((tx) => ({
        ...tx,
        created_at: tx.created_at
          ? dayjs(tx.created_at).toISOString()
          : dayjs().toISOString(),
      }));

      setTransactions(
        page === 0 ? formattedData : [...transactions, ...formattedData],
      );
      setHasMore(data.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const groupByDate = (transactions) => {
    const groups = {};
    transactions.forEach((tx) => {
      const date = new Date(tx.created_at).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(tx);
    });
    return groups;
  };

  const groupedTransactions = groupByDate(transactions);

  return (
    <div className="min-h-screen bg-[#F5F7F9]">
      {/* Header */}
      <div className="bg-white px-6 py-4 border-b border-slate-100">
        <h1 className="text-center font-bold text-lg text-slate-800">
          ประวัติธุรกรรม
        </h1>
      </div>

      {/* Filter */}
      <div className="p-6 pb-4">
        <Select
          value={filter}
          onValueChange={(value) => {
            setFilter(value);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-full bg-white border-slate-200 h-14 rounded-2xl">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-slate-500" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            <SelectItem value="sent">โอนออก</SelectItem>
            <SelectItem value="received">รับเข้า</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transactions List */}
      <div className="px-6 pb-6 space-y-6">
        {Object.entries(groupedTransactions).map(([date, txs]) => (
          <div key={date}>
            {/* Date Header */}
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={14} className="text-slate-400" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {date}
              </p>
            </div>

            {/* Transaction Cards */}
            <div className="space-y-2">
              {txs.map((tx, index) => {
                const isReceived = tx.receiver_id === profile.line_user_id;

                // Fallbacks for older transactions that don't have names/avatars stored
                const txSenderName =
                  tx.sender_name ||
                  (isReceived
                    ? "ผู้ใช้ท่านอื่น"
                    : `${profile.first_name} ${profile.last_name}`);
                const txReceiverName =
                  tx.receiver_name ||
                  (isReceived
                    ? `${profile.first_name} ${profile.last_name}`
                    : "ผู้ใช้ท่านอื่น");

                const otherUserName = isReceived
                  ? txSenderName
                  : txReceiverName;
                const otherUserAvatar = isReceived
                  ? tx.sender_avatar
                  : tx.receiver_avatar;

                return (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() =>
                      setExpandedId(expandedId === tx.id ? null : tx.id)
                    }
                    className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      {/* Left: Avatar & Info */}
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            isReceived
                              ? "bg-green-50 border-2 border-green-100"
                              : "bg-red-50 border-2 border-red-100"
                          }`}
                        >
                          {otherUserAvatar ? (
                            <img
                              src={otherUserAvatar}
                              alt={otherUserName}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : isReceived ? (
                            <ArrowDownLeft
                              size={20}
                              className="text-green-600"
                            />
                          ) : (
                            <ArrowUpRight size={20} className="text-red-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">
                            {otherUserName}
                          </p>
                          <p className="text-xs text-slate-400">
                            {new Date(tx.created_at).toLocaleTimeString(
                              "th-TH",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Right: Amount */}
                      <div className="text-right">
                        <p
                          className={`text-lg font-black ${
                            isReceived ? "text-[#138141]" : "text-red-600"
                          }`}
                        >
                          {isReceived ? "+" : "-"}฿{tx.amount.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Collapsible Detail Section */}
                    <AnimatePresence>
                      {expandedId === tx.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <div className="mt-4 pt-4 border-t border-dashed border-slate-100 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-400">
                                เลขที่รายการ
                              </span>
                              <span className="text-xs font-mono font-medium text-slate-600">
                                {tx.id}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-400">
                                จาก
                              </span>
                              <span className="text-xs font-bold text-slate-700">
                                {txSenderName}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-400">
                                ถึง
                              </span>
                              <span className="text-xs font-bold text-slate-700">
                                {txReceiverName}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-400">
                                เวลาที่ทำรายการ
                              </span>
                              <span className="text-xs font-bold text-slate-700">
                                {new Date(tx.created_at).toLocaleString(
                                  "th-TH",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  },
                                )}{" "}
                                น.
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-400">
                                ประเภท
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  isReceived
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {isReceived ? "รับเงิน" : "โอนเงิน"}
                              </span>
                            </div>
                            <div className="flex justify-between items-center pt-2">
                              <span className="text-xs text-slate-400">
                                สถานะ
                              </span>
                              <span className="text-xs font-bold text-[#138141]">
                                สำเร็จ
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Loading */}
        {loading && (
          <div className="text-center py-8">
            <Loader2
              size={32}
              className="animate-spin text-[#138141] mx-auto"
            />
          </div>
        )}

        {/* Load More */}
        {!loading && hasMore && (
          <Button
            onClick={() => setPage(page + 1)}
            variant="outline"
            className="w-full py-6 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 font-bold"
          >
            โหลดเพิ่มเติม
          </Button>
        )}

        {/* Empty State */}
        {!loading && transactions.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Receipt size={32} className="text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">ยังไม่มีประวัติธุรกรรม</p>
            <p className="text-xs text-slate-400 mt-2">
              เริ่มโอนเครดิตเพื่อดูประวัติที่นี่
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
