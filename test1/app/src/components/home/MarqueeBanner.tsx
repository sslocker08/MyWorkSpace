export function MarqueeBanner() {
  const segment = 'ARTISANAT · MODE · ÉPICERIE FINE · MAISON · 工芸 · ファッション · 食 · ホーム · JAPON → FRANCE · 職人の手仕事 · '

  return (
    <div className="bg-encre overflow-hidden py-3.5 select-none border-y border-ivoire/5">
      <div className="flex whitespace-nowrap animate-marquee">
        <span className="font-dm text-[11px] tracking-[0.18em] text-ivoire/50 pr-0">
          {segment}
        </span>
        <span className="font-dm text-[11px] tracking-[0.18em] text-ivoire/50 pr-0" aria-hidden>
          {segment}
        </span>
      </div>
    </div>
  )
}
