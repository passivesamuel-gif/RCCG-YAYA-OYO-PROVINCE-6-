import React, { useEffect } from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const HomePage: React.FC = () => {
  const { navigate } = useRouter();
  const { user } = useAuth();

  // If already authenticated, navigate to library
  useEffect(() => {
    if (user) {
      navigate('/library');
    }
  }, [user, navigate]);

  // Real provincial topics (no fake books or authors)
  const subjects = [
    {
      number: '01',
      title: 'Marriage, Family & Courtship',
      scope: 'Biblical counsel for godly unions, courtship purity, and Christ-honouring homes.',
    },
    {
      number: '02',
      title: 'Faith, Prayer & Intercession',
      scope: 'Developing steadfast trust in God, cultivating a vibrant prayer life, and spiritual victory.',
    },
    {
      number: '03',
      title: 'The Person & Power of the Holy Spirit',
      scope: 'Spiritual gifts, walking in the Spirit, intimacy with God, and empowerment for divine service.',
    },
    {
      number: '04',
      title: 'Youth Purpose & Divine Destiny',
      scope: 'Discovering God’s calling, career excellence, stewardship, and standing strong in Christ.',
    },
    {
      number: '05',
      title: 'Christian Leadership & Ministry',
      scope: 'Integrity in leadership, servant ministry, and positive generational influence.',
    },
    {
      number: '06',
      title: 'Biblical Living & Holiness',
      scope: 'Sound biblical teaching, personal consecration, and enduring fruitfulness in daily life.',
    },
  ];

  return (
    <div className="bg-[#FAF8F2] text-[#252B2A] pb-20 text-left">
      {/* ------------------------------------------------------------- */}
      {/* 1. HERO SECTION: Book-Cover Crest Composition & Welcoming Text */}
      {/* ------------------------------------------------------------- */}
      <section className="relative overflow-hidden pt-10 sm:pt-16 md:pt-20 pb-16 md:pb-24 border-b border-[#EEF5F0] hero-fade-rise">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
            {/* Left Column: Bold Typographic Axis (7 of 12 columns) */}
            <div className="lg:col-span-7 space-y-6 text-left">
              {/* Eyebrow with Soft Gold Hairline Rule */}
              <div className="space-y-2">
                <p className="text-[11px] sm:text-xs font-heading font-semibold tracking-[0.2em] uppercase text-[#737B76]">
                  The Redeemed Christian Church of God · Oyo Province 6
                </p>
                <div className="h-[1.5px] w-20 bg-[#D4AF65]" />
              </div>

              {/* Hero Headline in Montserrat ExtraBold */}
              <h1 className="font-heading font-extrabold text-4xl sm:text-5xl lg:text-6xl text-[#123D2A] tracking-tight leading-[1.08]">
                Discover. Read. Grow.
              </h1>

              {/* Warm, Clear Paragraph */}
              <p className="text-base sm:text-lg text-[#252B2A]/85 leading-relaxed max-w-xl font-normal">
                A Christian library published by RCCG YAYA Oyo Province 6 for approved readers. Deepen your faith, build your character, and read Christ-centred literature online anytime.
              </p>

              {/* Primary & Secondary Action Pair (Full-width on mobile) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2 max-w-md sm:max-w-none">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto justify-center"
                  onClick={() => navigate('/signup')}
                  icon={<ArrowRight className="w-4 h-4 text-[#D4AF65]" />}
                >
                  Reader Access
                </Button>

                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto justify-center"
                  onClick={() => navigate('/login')}
                >
                  Sign In
                </Button>
              </div>

              {/* Audience Welcoming Line - Open to everyone */}
              <p className="text-xs text-[#737B76] pt-1 leading-relaxed">
                Enter your reader membership passcode to start reading.
              </p>
            </div>

            {/* Right Column: Book-Cover Crest Composition & Scripture Pull-Quote (5 of 12 columns) */}
            <div className="lg:col-span-5 flex flex-col items-center w-full max-w-md mx-auto lg:max-w-none">
              {/* Forest-Green Book Cover Panel */}
              <div className="w-full bg-[#123D2A] text-white p-7 sm:p-9 md:p-10 rounded-xs relative shadow-md overflow-hidden text-center">
                {/* Thin gold hairline frame inset from edge */}
                <div className="absolute inset-2.5 sm:inset-3 border border-[#D4AF65]/60 pointer-events-none" />

                {/* Subtle cloth spine crease accent */}
                <div className="absolute left-6 sm:left-7 top-0 bottom-0 w-[1px] bg-black/25 pointer-events-none" />

                {/* Official Crest with subtle ivory circular backing */}
                <div className="w-28 h-39 sm:w-34 sm:h-47 md:w-38 md:h-53 flex items-center justify-center mx-auto relative mt-1">
                  <div className="absolute inset-x-2 bottom-1 h-3/4 bg-[#FAF8F2] rounded-full -z-0 shadow-xs" />
                  <img
                    src="/assets/yaya-crest.png"
                    alt="Official RCCG YAYA Crest"
                    className="w-full h-full object-contain relative z-10"
                    loading="eager"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Book Title & Subtitle in Montserrat */}
                <div className="mt-5 space-y-1 relative z-10">
                  <p className="font-heading font-extrabold text-sm sm:text-base text-white tracking-wider uppercase">
                    RCCG YAYA OYO 6
                  </p>
                  <p className="text-[11px] sm:text-xs font-heading font-bold text-[#D4AF65] tracking-[0.22em] uppercase">
                    E-LIBRARY
                  </p>
                </div>

                {/* Gold Hairline Separator */}
                <div className="h-[1.5px] w-14 bg-[#D4AF65] mx-auto my-3 relative z-10" />

                {/* Short Inspiring Theme Line */}
                <p className="font-heading font-semibold text-xs text-[#FAF8F2]/90 tracking-wide relative z-10">
                  Read. Learn. Grow in Christ.
                </p>
              </div>

              {/* Quiet Scripture Pull-Quote Area Below the Panel */}
              <div className="w-full mt-4 p-5 sm:p-6 bg-white border border-[#EEF5F0] rounded-xs text-left shadow-2xs">
                <div className="w-10 h-[1.5px] bg-[#D4AF65] mb-2.5" />
                <blockquote className="font-sans italic text-xs sm:text-sm text-[#252B2A]/90 leading-relaxed">
                  &ldquo;Study to shew thyself approved unto God, a workman that needeth not to be ashamed, rightly dividing the word of truth.&rdquo;
                </blockquote>
                <p className="font-heading font-semibold text-[11px] text-[#123D2A] uppercase tracking-wider mt-2.5">
                  2 Timothy 2:15
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 2. HOW IT WORKS: Numbered Editorial Table of Contents         */}
      {/* ------------------------------------------------------------- */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 border-b border-[#EEF5F0]">
        <div className="border-b border-[#EEF5F0] pb-6 mb-10 text-left">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-heading font-semibold tracking-[0.2em] text-[#123D2A] uppercase">
              How It Works
            </span>
            <span className="text-xs text-[#737B76]">·</span>
            <span className="text-[11px] font-heading font-semibold text-[#737B76] uppercase">Section 01</span>
          </div>
          <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#123D2A] mt-1 tracking-tight">
            Reading Made Simple
          </h2>
          <div className="h-[1.5px] w-12 bg-[#D4AF65] mt-2" />
        </div>

        {/* Table-of-Contents Layout with Hairline Rules */}
        <div className="divide-y divide-[#EEF5F0]">
          <div className="py-8 grid grid-cols-1 md:grid-cols-12 gap-4 items-baseline">
            <div className="md:col-span-2">
              <span className="font-heading text-xl font-bold text-[#123D2A]">
                01
              </span>
            </div>
            <div className="md:col-span-4">
              <h3 className="font-heading font-bold text-lg text-[#123D2A]">
                Enter your membership passcode
              </h3>
            </div>
            <div className="md:col-span-6">
              <p className="text-sm text-[#737B76] leading-relaxed">
                Use your reader membership passcode, or continue with Google if you already use a Google account.
              </p>
            </div>
          </div>

          <div className="py-8 grid grid-cols-1 md:grid-cols-12 gap-4 items-baseline">
            <div className="md:col-span-2">
              <span className="font-heading text-xl font-bold text-[#123D2A]">
                02
              </span>
            </div>
            <div className="md:col-span-4">
              <h3 className="font-heading font-bold text-lg text-[#123D2A]">
                Browse the collection
              </h3>
            </div>
            <div className="md:col-span-6">
              <p className="text-sm text-[#737B76] leading-relaxed">
                Find Christian books on marriage, prayer, leadership, and youth destiny. Search by title, author, or category.
              </p>
            </div>
          </div>

          <div className="py-8 grid grid-cols-1 md:grid-cols-12 gap-4 items-baseline">
            <div className="md:col-span-2">
              <span className="font-heading text-xl font-bold text-[#123D2A]">
                03
              </span>
            </div>
            <div className="md:col-span-4">
              <h3 className="font-heading font-bold text-lg text-[#123D2A]">
                Read online and continue where you stopped
              </h3>
            </div>
            <div className="md:col-span-6">
              <p className="text-sm text-[#737B76] leading-relaxed">
                Open any book in your browser. Your reading progress is saved automatically so you can resume anytime on your phone or laptop.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 3. SCRIPTURE PULL-QUOTE SECTION                               */}
      {/* ------------------------------------------------------------- */}
      <section className="bg-white border-b border-[#EEF5F0] py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="w-10 h-0.5 bg-[#D4AF65] mx-auto" />
          <blockquote className="font-sans italic text-lg sm:text-2xl text-[#123D2A] leading-relaxed">
            &ldquo;Till I come, give attendance to reading, to exhortation, to doctrine.&rdquo;
          </blockquote>
          <p className="text-xs sm:text-sm font-heading font-semibold text-[#123D2A] uppercase tracking-widest">
            — 1 Timothy 4:13
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 4. THEMATIC INDEX SECTION: Typographic Subjects Index         */}
      {/* ------------------------------------------------------------- */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="border-b border-[#EEF5F0] pb-6 mb-10 text-left">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-heading font-semibold tracking-[0.2em] text-[#123D2A] uppercase">
              Topics Covered
            </span>
            <span className="text-xs text-[#737B76]">·</span>
            <span className="text-[11px] font-heading font-semibold text-[#737B76] uppercase">Section 02</span>
          </div>
          <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#123D2A] mt-1 tracking-tight">
            Library Topics
          </h2>
          <div className="h-[1.5px] w-12 bg-[#D4AF65] mt-2" />
          <p className="text-xs sm:text-sm text-[#737B76] max-w-2xl mt-2 leading-relaxed">
            Books uploaded to the library address key areas of spiritual maturity and Christian living.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
          {subjects.map((sub) => (
            <div
              key={sub.number}
              className="border-t border-[#EEF5F0] pt-4 space-y-1.5 text-left"
            >
              <div className="flex items-center justify-between text-xs font-heading font-bold text-[#123D2A]">
                <span>{sub.number}</span>
                <span className="text-[10px] uppercase font-heading font-semibold tracking-wider text-[#737B76]">Topic</span>
              </div>
              <h3 className="font-heading font-bold text-base text-[#123D2A]">
                {sub.title}
              </h3>
              <p className="text-xs text-[#737B76] leading-relaxed">
                {sub.scope}
              </p>
            </div>
          ))}
        </div>

        {/* Closing Invitation Box */}
        <div className="mt-16 p-8 sm:p-12 bg-white border border-[#D4AF65]/35 rounded-xs shadow-xs text-center space-y-4 max-w-2xl mx-auto relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#123D2A]" />
          <h3 className="font-heading font-extrabold text-2xl text-[#123D2A]">
            Start Reading Today
          </h3>
          <p className="text-xs sm:text-sm text-[#737B76] max-w-md mx-auto leading-relaxed">
            Enter your reader membership passcode to access Christian books published by RCCG YAYA Oyo Province 6.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            <Button
              variant="primary"
              size="md"
              className="w-full sm:w-auto justify-center"
              onClick={() => navigate('/signup')}
              icon={<ArrowRight className="w-3.5 h-3.5 text-[#D4AF65]" />}
            >
              Reader Access
            </Button>
            <Button
              variant="secondary"
              size="md"
              className="w-full sm:w-auto justify-center"
              onClick={() => navigate('/login')}
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
