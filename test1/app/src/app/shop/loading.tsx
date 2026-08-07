export default function ShopLoading() {
  return (
    <div className="pt-24 min-h-screen">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <div className="py-12 md:py-16 border-b border-encre/10 mb-10">
          <div className="h-3 w-32 bg-encre/6 rounded mb-4 animate-pulse" />
          <div className="h-12 w-48 bg-encre/8 rounded animate-pulse" />
        </div>
        <div className="flex gap-2 mb-10">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 w-20 bg-encre/6 rounded-full animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <div className="aspect-[3/4] bg-encre/6 animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
              <div className="h-3 w-3/4 bg-encre/6 animate-pulse" />
              <div className="h-3 w-1/2 bg-encre/4 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
