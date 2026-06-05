"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Image from "next/image";

export default function CapmarShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Shrink the CapmarShowcase over the first 50% of the scroll (100vh)
  // We use a function to return a CSS calc string to avoid unit interpolation errors in framer-motion
  const containerWidth = useTransform(scrollYProgress, (p) => {
    const ratio = Math.min(p / 0.5, 1);
    return `calc(100vw - (100vw - 360px) * ${ratio})`;
  });
  
  const containerHeight = useTransform(scrollYProgress, (p) => {
    const ratio = Math.min(p / 0.5, 1);
    return `calc(100vh - (100vh - 700px) * ${ratio})`;
  });
  
  const containerRadius = useTransform(scrollYProgress, [0, 0.5], ["0px", "50px"]);

  // Scale down the content inside so it fits perfectly in the phone
  const contentScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.25]);

  // Color & Opacity Transitions
  const bgColor = useTransform(scrollYProgress, [0, 0.5], ["#0B0B2A", "#ffffff"]);
  const imageOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const textColor = useTransform(scrollYProgress, [0, 0.5], ["#ffffff", "#421C77"]); // to primary color
  const textShadow = useTransform(scrollYProgress, [0, 0.5], ["0px 10px 15px rgba(0,0,0,0.5)", "0px 0px 0px rgba(0,0,0,0)"]);
  
  return (
    <section ref={containerRef} className="relative w-full h-[200vh]">
      <div className="sticky top-0 w-full h-screen flex items-center justify-center overflow-hidden bg-background">
        
        {/* The shrinking CapmarShowcase */}
        <motion.div 
          style={{ 
            width: containerWidth, 
            height: containerHeight, 
            borderRadius: containerRadius,
            backgroundColor: bgColor
          }}
          className="relative z-20 overflow-hidden flex items-center justify-center shadow-2xl"
        >
          {/* Background Image - Absolute to cover full viewport size initially */}
          <motion.div 
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vh]"
            style={{ opacity: imageOpacity }}
          >
            <Image
              src="/capybara_rocket_space.png"
              alt="Capybara Rocket Space"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-black/10 z-10" /> 
          </motion.div>

          {/* Scaled Text */}
          <motion.div 
            style={{ scale: contentScale }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center justify-center font-heading font-black uppercase w-[100vw] h-[100vh] pointer-events-none"
          >
            <motion.h2 
              className="flex flex-col items-center text-center transform scale-y-[1.1] md:scale-y-[1.15]"
              style={{ 
                fontSize: "clamp(3.5rem, 12.5vw, 16rem)", 
                lineHeight: "0.85", 
                letterSpacing: "-0.04em",
                color: textColor,
                textShadow: textShadow,
              }}
            >
              <span className="relative z-10">IDEIAS</span>
              <span className="relative z-10 flex items-center justify-center">BRILHANTES</span>
              <span className="relative z-10">MUDAM O</span>
              <span className="relative z-10">MUNDO</span>
            </motion.h2>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
