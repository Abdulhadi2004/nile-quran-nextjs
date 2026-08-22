"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lalezar, Tajawal } from "next/font/google";
import {
  Pencil,
  X,
  Mail,
  Loader2,
  Check,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import { updateUser } from "@/actions/profile";

const lalezar = Lalezar({ subsets: ["arabic"], weight: "400" });
const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

interface Props {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
}

export default function EditOwnProfile({ userId, firstName, lastName, email }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`${tajawal.className} inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#F7FBEA] border border-[#043F2E]/15 text-[#043F2E] text-xs font-bold hover:bg-[#BEE663]/30 transition-colors`}
      >
        <Pencil className="w-3.5 h-3.5" strokeWidth={2.4} />
        تعديل بياناتي
      </button>

      {open && (
        <EditModal
          userId={userId}
          firstName={firstName}
          lastName={lastName}
          email={email}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function EditModal({
  userId,
  firstName: initialFirst,
  lastName: initialLast,
  email: initialEmail,
  onClose,
}: Props & { onClose: () => void }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(initialFirst || "");
  const [lastName, setLastName] = useState(initialLast || "");
  const [email, setEmail] = useState(initialEmail || "");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = () => {
    setResult(null);

    const data: { first_name?: string; last_name?: string; email?: string } = {};
    if (firstName !== initialFirst) data.first_name = firstName;
    if (lastName !== initialLast) data.last_name = lastName;
    if (email !== initialEmail) data.email = email;

    if (Object.keys(data).length === 0) {
      setResult({ success: false, message: "لم تقم بأي تغييرات" });
      return;
    }

    startTransition(async () => {
      const res = await updateUser(userId, data);
      if (res.success) {
        setResult({ success: true, message: "تم تحديث بياناتك بنجاح" });
        router.refresh();
        setTimeout(onClose, 1500);
      } else {
        setResult({ success: false, message: res.error || "فشل تحديث البيانات" });
      }
    });
  };

  const inputClass = `${tajawal.className} w-full h-11 px-4 bg-[#F7FBEA] border border-[#043F2E]/15 rounded-2xl text-[#043F2E] placeholder:text-[#043F2E]/40 focus:outline-none focus:border-[#043F2E]/40 focus:bg-white transition-colors text-sm font-medium`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#043F2E]/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="تعديل بياناتي"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[400px] max-h-[85vh] overflow-y-auto bg-white rounded-3xl border border-[#043F2E]/10 shadow-lg p-5 flex flex-col gap-4"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#043F2E] flex items-center justify-center">
              <Pencil className="w-4 h-4 text-[#BEE663]" strokeWidth={2.4} />
            </div>
            <h3 className={`${lalezar.className} text-lg text-[#043F2E]`}>تعديل بياناتي</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-[#043F2E]/60 hover:bg-[#F7FBEA] hover:text-[#043F2E] transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" strokeWidth={2.2} />
          </button>
        </div>

        {/* Form fields */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className={`${tajawal.className} text-xs font-bold text-[#043F2E]/70`}>الاسم الأول</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={isPending} className={inputClass} placeholder="الاسم الأول" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={`${tajawal.className} text-xs font-bold text-[#043F2E]/70`}>الاسم الأخير</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={isPending} className={inputClass} placeholder="الاسم الأخير" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={`${tajawal.className} text-xs font-bold text-[#043F2E]/70`}>البريد الإلكتروني</label>
            <div className="relative">
              <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#043F2E]/40" strokeWidth={2.2} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} disabled={isPending} type="email" dir="auto" className={`${inputClass} pr-11`} placeholder="email@example.com" />
            </div>
          </div>
        </div>

        {/* Result message */}
        {result && (
          <div
            role={result.success ? "status" : "alert"}
            className={`flex items-center gap-2 rounded-xl px-3 py-2.5 ${
              result.success
                ? "bg-[#DEFF90] border border-[#9ADD00]/40 text-[#043F2E]"
                : "bg-[#F4E0D6] border border-[#9B3D2E]/30 text-[#9B3D2E]"
            }`}
          >
            {result.success ? (
              <Check className="w-4 h-4 shrink-0" strokeWidth={2.5} />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={2.2} />
            )}
            <span className={`${tajawal.className} text-xs font-medium`}>{result.message}</span>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className={`${tajawal.className} h-12 rounded-xl bg-[#043F2E] text-white text-sm font-bold hover:bg-[#065f46] transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}
        >
          {isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />جارٍ الحفظ...</>
          ) : (
            <><UserCheck className="w-4 h-4" strokeWidth={2.4} />حفظ التغييرات</>
          )}
        </button>
      </div>
    </div>
  );
}
