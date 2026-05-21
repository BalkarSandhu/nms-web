import { useEffect, useState } from "react";
import { X } from "lucide-react";

export interface DowntimeRecord {
  id?: string | number;
  timestamp: string;
  duration_seconds?: number;
  endTime?: string;
  remarks?: string;
}

interface DowntimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: any;
  records: DowntimeRecord[];
  onSaveRemark?: (recordId: string | number, remark: string) => void;
}

export default function DowntimeModal({
  isOpen,
  onClose,
  device,
  records,
  onSaveRemark,
}: DowntimeModalProps) {
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editRemark, setEditRemark] = useState("");

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return timestamp;
    }
  };

  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return timestamp;
    }
  };

  const calculateTimeRange = (record: DowntimeRecord) => {
    if (record.endTime) {
      return `${formatTime(record.timestamp)} to ${formatTime(record.endTime)}`;
    }
    if (record.duration_seconds) {
      const endDate = new Date(
        new Date(record.timestamp).getTime() + record.duration_seconds * 1000
      );
      return `${formatTime(record.timestamp)} to ${formatTime(endDate.toISOString())}`;
    }
    return formatTime(record.timestamp);
  };

  const handleEditClick = (record: DowntimeRecord) => {
    setEditingId(record.id || 0);
    setEditRemark(record.remarks || "");
  };

  const handleSaveRemark = (recordId: string | number) => {
    if (onSaveRemark) {
      onSaveRemark(recordId, editRemark);
    }
    setEditingId(null);
    setEditRemark("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop blur */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl rounded-t-2xl bg-slate-900 border border-slate-700 shadow-2xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Downtime Records</h2>
              <p className="text-sm text-slate-400 mt-1">
                {device?.display || device?.hostname || "Device"} • {device?.ip_address || "N/A"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {records.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-slate-400">No downtime records found for this device.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {records.map((record, idx) => (
                <div
                  key={record.id || idx}
                  className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 hover:bg-slate-800/70 transition-colors"
                >
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400 mb-1">
                        Date
                      </p>
                      <p className="text-sm text-slate-100">{formatDate(record.timestamp)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400 mb-1">
                        Time Range
                      </p>
                      <p className="text-sm text-slate-100">{calculateTimeRange(record)}</p>
                    </div>
                  </div>

                  {/* Remarks Section */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400 mb-2">
                      Remarks
                    </p>
                    {editingId === record.id ? (
                      <div className="flex gap-2">
                        <textarea
                          value={editRemark}
                          onChange={(e) => setEditRemark(e.target.value)}
                          placeholder="Enter remarks (e.g., Power Cut, Network Issue, etc.)"
                          className="flex-1 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                          rows={2}
                        />
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleSaveRemark(record.id || 0)}
                            className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs font-semibold transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <p className="text-sm text-slate-300 leading-relaxed flex-1">
                          {record.remarks ? (
                            <span>{record.remarks}</span>
                          ) : (
                            <span className="text-slate-500 italic">No remarks added</span>
                          )}
                        </p>
                        <button
                          onClick={() => handleEditClick(record)}
                          className="ml-3 px-2 py-1 rounded text-xs font-semibold text-cyan-400 hover:bg-slate-700/50 transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-900 border-t border-slate-700 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
