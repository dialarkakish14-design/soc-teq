export function Pill({
  tone,
  children,
}: {
  tone: "default" | "off" | "violet" | "flag";
  children: React.ReactNode;
}) {
  const styles = {
    default: "bg-[#DCEFEB] text-[#064B45]",
    off: "bg-[#EAEFEE] text-[#5C6B6F]",
    violet: "bg-[#EEE7F3] text-[#5E3F73]",
    flag: "bg-[#FAEBD4] text-[#8F5205]",
  }[tone];
  return (
    <span className={`whitespace-nowrap rounded-lg px-2 py-1 font-mono text-[10px] font-semibold uppercase ${styles}`}>
      {children}
    </span>
  );
}
