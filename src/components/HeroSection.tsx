"use client";

export default function HeroSection() {
  return (
    <div className="pt-16 pb-8 text-center">
      <h1
        className="text-5xl font-normal tracking-tight text-[#F1F1F3] sm:text-6xl"
        style={{ fontFamily: "var(--font-serif), serif" }}
      >
        Every small business
        <br />
        deserves a legal team.
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-lg text-[#8A8F98]">
        Upload any contract. Get instant analysis of unfavorable clauses,
        corporate-grade counter-proposals, and plain-English explanations of what
        you&apos;re actually signing.
      </p>
    </div>
  );
}
