import Image from "next/image";

export default function AvatarGreeting() {
  return (
    <div className="flex items-end gap-4 -mt-2">
      {/* Avatar Image */}
      <div className="relative flex-shrink-0 w-28 h-[140px]">
        <Image
          src="/ni-avatar.png"
          alt="AI Assistant"
          fill
          className="object-contain object-bottom drop-shadow-md"
          priority
        />
      </div>

      {/* Speech Bubble */}
      <div className="relative mb-2">
        <div
          className="relative px-5 py-4 rounded-2xl rounded-bl-none text-sm leading-relaxed max-w-xs shadow-sm"
          style={{ backgroundColor: "#e6f7f5", border: "1.5px solid var(--teal-light)", color: "var(--foreground)" }}
        >
          <p className="font-medium text-[13px] leading-relaxed" style={{ color: "var(--foreground)" }}>
            Chào buổi tối, <span className="font-bold" style={{ color: "var(--teal)" }}>[Tên User]</span>. Mai có bài thuyết trình Văn phải không? Tập dượt chút nhé?
          </p>
        </div>
        {/* Triangle pointer */}
        <div
          className="absolute -bottom-2 left-0 w-0 h-0"
          style={{
            borderTop: "10px solid #e6f7f5",
            borderRight: "12px solid transparent",
          }}
        />
      </div>
    </div>
  );
}
