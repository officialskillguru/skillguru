export function HeroSkeleton() {
  return (
    <div className="bg-white rounded-3xl p-8 mb-8 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-8 items-start animate-pulse">
      <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-slate-200 shrink-0" />
      <div className="flex-1 w-full">
        <div className="flex flex-col gap-4">
          <div className="h-8 bg-slate-200 rounded-lg w-1/3" />
          <div className="h-5 bg-slate-200 rounded-lg w-1/4" />
          <div className="flex gap-4 mt-2">
            <div className="h-4 bg-slate-200 rounded w-20" />
            <div className="h-4 bg-slate-200 rounded w-20" />
            <div className="h-4 bg-slate-200 rounded w-20" />
          </div>
          <div className="h-4 bg-slate-200 rounded w-full mt-4" />
          <div className="h-4 bg-slate-200 rounded w-5/6" />
        </div>
      </div>
    </div>
  );
}

export function ContentSkeleton() {
  return (
    <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-100 mb-8 animate-pulse">
      <div className="h-7 bg-slate-200 rounded-lg w-48 mb-8" />
      <div className="space-y-4">
        <div className="h-4 bg-slate-200 rounded w-full" />
        <div className="h-4 bg-slate-200 rounded w-full" />
        <div className="h-4 bg-slate-200 rounded w-3/4" />
      </div>
    </div>
  );
}

export function TimelineSkeleton() {
  return (
    <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-100 mb-8 animate-pulse">
      <div className="h-7 bg-slate-200 rounded-lg w-56 mb-8" />
      <div className="space-y-8 pl-6 border-l-2 border-slate-100">
        {[1, 2].map((i) => (
          <div key={i} className="relative pl-6">
            <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-slate-200 border-4 border-white" />
            <div className="h-5 bg-slate-200 rounded w-1/3 mb-2" />
            <div className="h-4 bg-slate-200 rounded w-1/4 mb-4" />
            <div className="space-y-2">
              <div className="h-3 bg-slate-200 rounded w-full" />
              <div className="h-3 bg-slate-200 rounded w-5/6" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardsSkeleton() {
  return (
    <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-100 mb-8 animate-pulse">
      <div className="h-7 bg-slate-200 rounded-lg w-48 mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="h-64 rounded-2xl bg-slate-50 border border-slate-100" />
        ))}
      </div>
    </div>
  );
}

export function BookingSkeleton() {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 animate-pulse">
      <div className="h-6 bg-slate-200 rounded-lg w-1/2 mb-6" />
      <div className="h-10 bg-slate-200 rounded-xl w-full mb-4" />
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-slate-200 rounded-xl" />
        ))}
      </div>
      <div className="h-12 bg-slate-300 rounded-xl w-full mt-8" />
    </div>
  );
}

export function MentorProfilePageSkeleton() {
  return (
    <div className="min-h-screen bg-muted pb-24">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 pt-8">
        <HeroSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 flex flex-col">
            <ContentSkeleton />
            <TimelineSkeleton />
            <CardsSkeleton />
          </div>
          <div className="lg:col-span-4">
            <BookingSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
