import Header from '@/components/navigation/header';
import Footer from '@/components/navigation/footer';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, MapPin, Users, Heart } from 'lucide-react';

export const metadata = {
  title: 'Who We Are | Lavie Studios',
  description: 'We are a creative design studio dedicated to building memorable brands and live event experiences.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-primary)] transition-colors">
      <Header />

      <main className="flex-1 pt-28 sm:pt-32 pb-16">
        {/* HERO SECTION */}
        <section className="max-w-4xl mx-auto px-5 sm:px-8 text-center pt-10 sm:pt-16 pb-16 sm:pb-24">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--bg-card)] text-[11px] font-mono tracking-widest uppercase text-[var(--text-muted)] mb-8 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c7cb2d]" />
            <span>The Life Studio</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[var(--text-primary)] leading-[1.1] mb-6">
            We breath life into <br/> brands and spaces.
          </h1>
          <p className="text-base sm:text-lg text-[var(--text-muted)] leading-relaxed max-w-2xl mx-auto">
            Lavie Studios is a team of designers, spatial engineers, and strategists. We started with a simple goal: to help event organizers, individuals, and companies tell their stories in a way that feels genuine, both online and in the physical world.
          </p>
        </section>

        {/* OUR STORY & IMAGE BLOCK */}
        <section className="max-w-7xl mx-auto px-5 sm:px-8 pb-20 sm:pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Image Side */}
            <div className="relative aspect-[4/5] sm:aspect-square lg:aspect-[4/5] w-full rounded-3xl overflow-hidden bg-[var(--bg-card)]">
              <Image
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80"
                alt="Lavie Studios Team Collaboration"
                fill
                className="object-cover grayscale hover:grayscale-0 transition-all duration-700"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
              <div className="absolute bottom-6 left-6 right-6 flex items-center gap-3">
                <span className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white text-[11px] font-mono tracking-wider font-bold border border-white/20">
                  CREATIVE DIRECTION
                </span>
              </div>
            </div>

            {/* Text Side */}
            <div className="space-y-8">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold mb-4">
                  Architects of Experiences
                </h2>
                <div className="space-y-4 text-sm sm:text-base text-[var(--text-muted)] leading-relaxed">
                  <p>

We believe the best events are more than beautiful spaces. They are experiences people feel, remember, and talk about long after they have left the room.</p>

<p> Developing a brand’s visual identity, transforming an event venue into an engaging, thoughtfully designed space, every detail, from the stage and lighting to the banners and backdrops, plays a part in creating an experience that feels connected, intentional, and worth remembering.</p>


<p> We work alongside event organizers, individuals, and companies to design great experiences for their audiences and clients. Across intimate gatherings, corporate events, or a 5,000-person summit, we transform visions into an experience that brings people together and leaves a lasting impression.</p>
<p> Today, we’ve work across Lagos, Abuja, Osogbo, Ogbomoso, and beyond, helping our clients create events that look good, feel right, and mean something to the people who experience them.
</p>
                   


                </div>
              </div>

              {/* Core Values List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-[var(--border-subtle)]">
                <div>
                  <div className="w-10 h-10 rounded-full bg-[var(--bg-card)] flex items-center justify-center mb-4 text-[#84871d] dark:text-[#c7cb2d]">
                    <Heart className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm mb-2">Human First</h4>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    We design for the people in the room, making sure every experience feels welcoming and intentional.
                  </p>
                </div>
                <div>
                  <div className="w-10 h-10 rounded-full bg-[var(--bg-card)] flex items-center justify-center mb-4 text-[#e55130]">
                    <Users className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm mb-2">Zero-Delay Execution</h4>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Live events don&apos;t wait. We pride ourselves on showing up early, setting up fast, and solving problems on the spot.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* OUR FOOTPRINT / LOCATIONS */}
        <section className="bg-[var(--bg-card)]/40 py-20 sm:py-24">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 text-center">
            <h2 className="font-display text-2xl sm:text-3xl font-bold mb-4">
              Where we work
            </h2>
            <p className="text-sm text-[var(--text-muted)] max-w-xl mx-auto mb-10">
              Our production teams travel wherever your event takes us. We have successfully deployed stages and brands across major Nigerian cities.
            </p>

            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              {['Lagos', 'Abuja', 'Ogbomoso', 'Osogbo', 'Ibadan'].map((city) => (
                <div key={city} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--bg-main)] border border-[var(--border-strong)] shadow-sm">
                  <MapPin className="w-4 h-4 text-[var(--text-dim)]" />
                  <span className="text-xs font-bold uppercase tracking-wider">{city}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="max-w-4xl mx-auto px-5 sm:px-8 py-20 sm:py-32 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-6">
            Ready to bring your idea to life?
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-muted)] mb-10 max-w-lg mx-auto">
        Tell us what you have in mind, and let's work together to bring it to life through thoughtful design and experiences that stay with people long after they've left the room.  </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact"
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-[var(--text-primary)] text-[var(--bg-main)] font-bold text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition flex items-center justify-center gap-2 shadow-sm"
            >
              Start a Conversation
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/portfolio"
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-[var(--bg-card)] text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider hover:bg-[var(--bg-card-hover)] transition flex items-center justify-center shadow-sm"
            >
              View Our Work
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}