"use client";

import { useRef, ReactNode } from "react";
import { motion, useScroll, useTransform, MotionValue, useMotionValue, useSpring, useMotionValueEvent } from "framer-motion";

interface ScreenContentProps {
  headerY: MotionValue<string>;
  headerOpacity: MotionValue<number>;
  postY: MotionValue<string>;
  postOpacity: MotionValue<number>;
  postScale: MotionValue<number>;
  navY: MotionValue<string>;
  navOpacity: MotionValue<number>;
}

const ScreenContent = ({
  headerY,
  headerOpacity,
  postY,
  postOpacity,
  postScale,
  navY,
  navOpacity,
}: ScreenContentProps) => {
  return (
    <>
      {/* App Header */}
      <motion.div 
        style={{ y: headerY, opacity: headerOpacity }}
        className="w-full flex justify-between items-center px-6 pt-8 pb-4 text-white border-b border-gray-800 shrink-0"
      >
        <div className="font-bold text-lg tracking-tight">CapMar</div>
        <div className="flex gap-4">
          <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <div className="relative">
            <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
            <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></div>
          </div>
        </div>
      </motion.div>

      {/* Feed Container */}
      <div className="flex-1 overflow-hidden px-4 pt-4 pb-20 relative">
        {/* Post Card */}
        <motion.div 
          style={{ y: postY, opacity: postOpacity, scale: postScale }}
          className="bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-800"
        >
          {/* Post Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-linear-to-tr from-purple-600 to-indigo-500 p-[2px]">
                <div className="w-full h-full bg-gray-900 rounded-full border-2 border-gray-900 overflow-hidden">
                  <div className="w-full h-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                    M
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Mariana Costa</h3>
                <p className="text-gray-400 text-xs">Product Designer • Há 2h</p>
              </div>
            </div>
            <button className="text-gray-400 hover:text-white">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z"></path></svg>
            </button>
          </div>

          {/* Post Content */}
          <div className="mb-4">
            <h4 className="text-white font-bold text-lg mb-1">Mais um passo para o projeto .</h4>
            <p className="text-gray-300 text-sm leading-relaxed">
              Hoje finalizamos a primeira fase da arquitetura e as telas principais. Muito orgulho dessa equipe incrível que está construindo o futuro! 🚀 #CapMar #Inovação
            </p>
          </div>

          {/* Regular Post Image */}
          <div className="w-full h-40 rounded-xl bg-linear-to-br from-indigo-500/20 to-purple-800/20 border border-white/5 flex items-center justify-center overflow-hidden mb-4 relative group cursor-pointer">
             <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent"></div>
             <div className="relative z-10 w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                <svg className="w-5 h-5 text-white translate-x-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg>
             </div>
          </div>

          {/* Post Footer (Likes/Comments) */}
          <div className="flex items-center justify-between border-t border-gray-800 pt-3">
            <div className="flex gap-4">
              <button className="flex items-center gap-1.5 text-pink-500 group">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"></path></svg>
                <span className="text-sm font-medium">1.2k</span>
              </button>
              <button className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                <span className="text-sm font-medium">128</span>
              </button>
            </div>
            <button className="text-gray-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Bottom Navigation */}
      <motion.div 
        style={{ y: navY, opacity: navOpacity }}
        className="absolute bottom-0 w-full h-16 bg-[#111111]/90 backdrop-blur-md border-t border-gray-800 flex items-center justify-around px-2 z-20 pb-2"
      >
        <div className="flex flex-col items-center justify-center w-12 h-12 text-white">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path></svg>
        </div>
        <div className="flex flex-col items-center justify-center w-12 h-12 text-gray-500 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>
        <div className="flex flex-col items-center justify-center w-12 h-12 -mt-6">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white shadow-lg shadow-primary/30">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center w-12 h-12 text-gray-500 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
        </div>
        <div className="flex flex-col items-center justify-center w-12 h-12 text-gray-500 hover:text-white transition-colors">
          <div className="w-6 h-6 rounded-full border-2 border-current overflow-hidden">
             <div className="w-full h-full bg-gray-800 flex items-center justify-center">
               <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path></svg>
             </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default function PhoneSection({ children }: { children?: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  
  // Mouse Parallax Setup
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start end", "end end"]
  });

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const handleMouseMove = (e: React.MouseEvent) => {
    const progress = scrollYProgress.get();
    // Only apply parallax during the "ápice" (when image and text are large)
    if (progress >= 0.5 && progress <= 0.95) {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      const x = (clientX / innerWidth) * 2 - 1;
      const y = (clientY / innerHeight) * 2 - 1;
      mouseX.set(x);
      mouseY.set(y);
    }
  };

  // Ensure parallax resets if user scrolls out of the apex without moving the mouse
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest < 0.5 || latest > 0.95) {
      mouseX.set(0);
      mouseY.set(0);
    }
  });

  const smoothX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  // Opposite movement: when mouse moves right (+1), object moves left (-)
  const phoneMouseX = useTransform(smoothX, [-1, 1], [30, -30]);
  const phoneMouseY = useTransform(smoothY, [-1, 1], [30, -30]);
  const phoneRotateY = useTransform(smoothX, [-1, 1], [-8, 8]);
  const phoneMouseRotateX = useTransform(smoothY, [-1, 1], [8, -8]);

  const textMouseX = useTransform(smoothX, [-1, 1], [60, -60]);
  const textMouseY = useTransform(smoothY, [-1, 1], [60, -60]);

  // Entering viewport (0 to 0.33)
  const y = useTransform(scrollYProgress, [0, 0.33], ["-100vh", "0vh"]);
  const rotateX = useTransform(scrollYProgress, [0, 0.33], [40, 0]);
  const rotateY = useTransform(scrollYProgress, [0, 0.33], [20, 0]);
  const rotateZ = useTransform(scrollYProgress, [0, 0.33], [-10, 0]);
  const phoneScale = useTransform(scrollYProgress, [0, 0.33], [0.7, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.33], [0, 0.8, 1]);

  // UI elements appear (0.33 to 0.45)
  const headerY = useTransform(scrollYProgress, [0.33, 0.4], ["-20px", "0px"]);
  const headerOpacity = useTransform(scrollYProgress, [0.33, 0.4], [0, 1]);

  const postY = useTransform(scrollYProgress, [0.38, 0.45], ["30px", "0px"]);
  const postOpacity = useTransform(scrollYProgress, [0.38, 0.45], [0, 1]);
  const postScale = useTransform(scrollYProgress, [0.38, 0.45], [0.95, 1]);

  const navY = useTransform(scrollYProgress, [0.4, 0.48], ["20px", "0px"]);
  const navOpacity = useTransform(scrollYProgress, [0.4, 0.48], [0, 1]);

  const solidOpacity = useTransform(scrollYProgress, [0.49, 0.5], [1, 0]);

  const tearTopX = useTransform(scrollYProgress, [0.5, 0.9], ["0px", "-450px"]);
  const tearTopY = useTransform(scrollYProgress, [0.5, 0.9], ["0px", "0px"]);
  const tearTopRotate = useTransform(scrollYProgress, [0.5, 0.9], [0, -5]);
  
  const tearBottomX = useTransform(scrollYProgress, [0.5, 0.9], ["0px", "450px"]);
  const tearBottomY = useTransform(scrollYProgress, [0.5, 0.9], ["0px", "0px"]);
  const tearBottomRotate = useTransform(scrollYProgress, [0.5, 0.9], [0, 5]);
  
  const clipTop = "polygon(0% 0%, 100% 0%, 100% 35%, 0% 65%)";
  const clipBottom = "polygon(0% 65%, 100% 35%, 100% 100%, 0% 100%)";

  const capybaraOpacity = useTransform(scrollYProgress, [0.9, 1.0], [1, 0]);

  const textScale = useTransform(scrollYProgress, [0.5, 0.6, 0.9, 1.0], [0.947, 1.0, 1.0, 0.1754]);
  const textOpacity = useTransform(scrollYProgress, [0.5, 0.6], [0, 1]);
  const textFilter = useTransform(scrollYProgress, [0.5, 0.6], ["blur(10px)", "blur(0px)"]);

  return (
    <section 
      className="relative w-full z-0"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { mouseX.set(0); mouseY.set(0); }}
    >
      <div ref={trackRef} className="absolute top-0 left-0 w-full h-[300vh] pointer-events-none" />

      {/* Note: No overflow-hidden here so the phone can enter from above (-100vh) over the Hero section! */}
      <div className="sticky top-0 w-full h-screen flex items-center justify-center py-20 px-4 perspective-distant z-0">
        
        <motion.div 
          style={{ 
            scale: textScale, 
            opacity: textOpacity, 
            filter: textFilter,
            x: textMouseX,
            y: textMouseY,
          }}
          className="absolute z-50 pointer-events-none flex flex-col items-center justify-center w-[1710px]"
        >
          <h2 className="font-heading font-black text-[171px] leading-none tracking-tighter text-primary uppercase text-center transform scale-y-[1.1] text-shadow-solid">
            Seu Projeto <br /> Visivel para o mundo
          </h2>
        </motion.div>

        {/* Parallax Wrapper for the whole phone */}
        <motion.div
          style={{
            x: phoneMouseX,
            y: phoneMouseY,
            rotateX: phoneMouseRotateX,
            rotateY: phoneRotateY
          }}
          className="relative z-40 w-full max-w-[360px] mx-auto"
        >
          {/* Phone Mockup Container (Mold) */}
          <motion.div 
            style={{ 
              y, 
              rotateX, 
              rotateY, 
              rotateZ, 
              scale: phoneScale, 
              opacity
            }} 
            className="relative w-full h-[700px] bg-background rounded-[50px] shadow-2xl overflow-hidden border-[6px] border-white flex flex-col"
          >
             {/* Background revealed content inside the phone */}
             <div className="absolute inset-0 flex items-center justify-center z-0 bg-background">
               <motion.img 
                 style={{ opacity: capybaraOpacity }}
                 src="/capybara.png" 
                 alt="Capybara" 
                 className="absolute inset-0 w-full h-full object-cover"
               />
             </div>

             {/* Solid un-torn screen (hides the crack until it's time to tear) */}
             <motion.div 
               className="absolute inset-0 flex flex-col bg-[#111111] z-20"
               style={{ opacity: solidOpacity }}
             >
               <ScreenContent 
                  headerY={headerY} headerOpacity={headerOpacity} 
                  postY={postY} postOpacity={postOpacity} postScale={postScale}
                  navY={navY} navOpacity={navOpacity}
               />
             </motion.div>

             {/* Top half of the screen */}
             <motion.div 
               className="absolute inset-0 flex flex-col bg-[#111111] z-10 origin-bottom-left"
               style={{
                 x: tearTopX,
                 y: tearTopY,
                 rotateZ: tearTopRotate,
                 clipPath: clipTop
               }}
             >
               <ScreenContent 
                  headerY={headerY} headerOpacity={headerOpacity} 
                  postY={postY} postOpacity={postOpacity} postScale={postScale}
                  navY={navY} navOpacity={navOpacity}
               />
             </motion.div>

             {/* Bottom half of the screen */}
             <motion.div 
               className="absolute inset-0 flex flex-col bg-[#111111] z-10 origin-top-right"
               style={{
                 x: tearBottomX,
                 y: tearBottomY,
                 rotateZ: tearBottomRotate,
                 clipPath: clipBottom
               }}
             >
               <ScreenContent 
                  headerY={headerY} headerOpacity={headerOpacity} 
                  postY={postY} postOpacity={postOpacity} postScale={postScale}
                  navY={navY} navOpacity={navOpacity}
               />
             </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* Spacer to push Features down until the 300vh animation finishes */}
      {/* 300vh total - 100vh sticky = 200vh spacer */}
      <div className="w-full h-[200vh] pointer-events-none" />

      {/* Children (Features) scroll over the sticky phone */}
      {children && (
        <div className="relative w-full z-10">
          {children}
        </div>
      )}
    </section>
  );
}
