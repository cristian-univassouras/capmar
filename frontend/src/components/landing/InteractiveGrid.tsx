"use client";

import React, { useEffect, useRef } from "react";

// ==========================================
// CONFIGURAÇÕES DA FÍSICA E DO VISUAL
// ==========================================
const CONFIG = {
  // Estrutura
  gridSpacing: 40,       // Distância entre os pontos (tamanho do "quadrado" da malha)
  
  // Visual
  lineColor: "rgba(0, 0, 0, 0.08)",  // Cor e opacidade das linhas
  pointColor: "rgba(0, 0, 0, 0.15)", // Cor e opacidade dos pontos
  pointRadius: 1.5,      // Tamanho do ponto nas interseções
  lineWidth: 1,          // Espessura da linha
  
  // Interação e Física
  mouseRadius: 300,      // Área de influência do mouse dobrada (tamanho da deformação e área visível)
  pushForce: 3.5,        // Força máxima com que o mouse empurra os pontos
  springRelief: 0.03,    // Mola: força de retorno (menor = mais elástico/lento, maior = mais rígido/rápido)
  damping: 0.85,         // Atrito/Amortecimento: 1 = sem atrito (nunca para), 0 = para na hora
};

// Tons de roxo baseados na cor principal do título (#421C77)
const PURPLE_SHADES = [
  "66, 28, 119",   // #421C77 (Primária)
  "90, 43, 156",   // Mais claro
  "115, 59, 193",  // Mais vibrante
  "140, 76, 230",  // Bem claro
  "45, 18, 82"     // Mais escuro
];

class Point {
  x: number;
  y: number;
  ox: number; // original X
  oy: number; // original Y
  vx: number; // velocity X
  vy: number; // velocity Y
  color: string; // RGB string

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.ox = x;
    this.oy = y;
    this.vx = 0;
    this.vy = 0;
    this.color = PURPLE_SHADES[Math.floor(Math.random() * PURPLE_SHADES.length)];
  }

  update(mouse: { x: number; y: number }, isHovering: boolean) {
    // 1. Força do mouse (repulsão radial)
    if (isHovering) {
      const dx = this.x - mouse.x;
      const dy = this.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < CONFIG.mouseRadius && dist > 0) {
        // Quanto mais perto, maior a repulsão
        const force = (CONFIG.mouseRadius - dist) / CONFIG.mouseRadius;
        const angle = Math.atan2(dy, dx);
        
        this.vx += Math.cos(angle) * force * CONFIG.pushForce;
        this.vy += Math.sin(angle) * force * CONFIG.pushForce;
      }
    }

    // 2. Força da mola (retorno à origem de forma orgânica)
    const fx = (this.ox - this.x) * CONFIG.springRelief;
    const fy = (this.oy - this.y) * CONFIG.springRelief;

    this.vx += fx;
    this.vy += fy;

    // 3. Aplica o atrito (damping) para estabilizar
    this.vx *= CONFIG.damping;
    this.vy *= CONFIG.damping;

    // 4. Atualiza posição final
    this.x += this.vx;
    this.y += this.vy;
  }
}

export default function InteractiveGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let points: Point[] = [];
    let cols = 0;
    let rows = 0;
    
    let animationFrameId: number;
    let width = 0;
    let height = 0;

    const mouse = { x: -1000, y: -1000 };
    let isHovering = false;

    // Inicializa a malha calculando o tamanho exato da tela
    const initGrid = () => {
      // Scale for retina displays to ensure crisp lines
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement?.getBoundingClientRect();
      
      if (!rect) return;
      
      width = rect.width;
      height = rect.height;
      
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Calcular colunas e linhas baseadas no espaçamento configurado
      // +2 garante que os cantos passem da borda da tela suavemente
      cols = Math.floor(width / CONFIG.gridSpacing) + 2; 
      rows = Math.floor(height / CONFIG.gridSpacing) + 2;
      
      points = [];

      // Centralizar a malha perfeitamente na tela
      const offsetX = (width - (cols - 1) * CONFIG.gridSpacing) / 2;
      const offsetY = (height - (rows - 1) * CONFIG.gridSpacing) / 2;

      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          const x = j * CONFIG.gridSpacing + offsetX;
          const y = i * CONFIG.gridSpacing + offsetY;
          points.push(new Point(x, y));
        }
      }
    };

    const draw = () => {
      // Limpa o frame anterior otimizado
      ctx.clearRect(0, 0, width, height);

      // Atualiza a física de todos os pontos
      for (let i = 0; i < points.length; i++) {
        points[i].update(mouse, isHovering);
      }


      // Desenha os pontos nas interseções apenas se estiverem perto do mouse
      const visibilityRadius = CONFIG.mouseRadius * 1.5; // Raio em que os pontos começam a aparecer

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        
        // Calcula a distância do ponto até o mouse
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Se o mouse estiver sobre o canvas e o ponto dentro do raio de visibilidade
        if (isHovering && dist < visibilityRadius) {
          // Calcula a opacidade (mais perto do centro = mais forte)
          let opacity = 1 - (dist / visibilityRadius);
          
          // Deixa a opacidade bem mais forte (max 90%) para não ficarem claros demais
          opacity *= 0.9;

          // Tamanho dinâmico (Degradê de escala)
          // Vai de 0 a 1 dependendo da distância até o limite de visibilidade
          const t = dist / visibilityRadius; 
          
          // Math.sin(t * Math.PI) gera uma curva:
          // t=0 (centro) -> 0
          // t=0.5 (meio) -> 1
          // t=1 (borda) -> 0
          const scaleCurve = Math.sin(t * Math.PI);
          
          // Raio original (1.5) cresce até 3x o tamanho (4.5) no auge da curva
          const dynamicRadius = CONFIG.pointRadius + (scaleCurve * (CONFIG.pointRadius * 2));

          ctx.fillStyle = `rgba(${p.color}, ${opacity})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, dynamicRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    // Capta o movimento do mouse na JANELA INTEIRA, 
    // assim o efeito funciona mesmo se o mouse estiver em cima do texto ou botão
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      
      // Verifica se o mouse está dentro da área do canvas
      if (
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom
      ) {
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
        isHovering = true;
      } else {
        isHovering = false;
      }
    };

    const handleMouseLeave = () => {
      isHovering = false;
      mouse.x = -1000;
      mouse.y = -1000;
    };
    
    // Debounce no resize para garantir performance se o usuário redimensionar a janela loucamente
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        initGrid();
      }, 200);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    initGrid();
    draw(); // Inicia o loop

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0, opacity: 0.8 }}
    />
  );
}
