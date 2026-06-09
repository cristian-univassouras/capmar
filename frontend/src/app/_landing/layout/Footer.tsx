import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-transparent text-foreground pt-20 pb-10 border-t border-black/10 relative z-20">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <span className="font-bold text-2xl tracking-tight">Capmar</span>
            </div>
            <p className="text-gray-600 text-sm">
              Conectando fundadores visionários aos investidores certos.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold mb-4 text-lg">Plataforma</h4>
            <ul className="space-y-3 text-gray-600 text-sm">
              <li><Link href="#" className="hover:text-primary transition-colors">Explorar Projetos</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Para Investidores</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Para Fundadores</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-lg">Recursos</h4>
            <ul className="space-y-3 text-gray-600 text-sm">
              <li><Link href="#" className="hover:text-primary transition-colors">Central de Ajuda</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Blog</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Comunidade</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-lg">Sobre</h4>
            <ul className="space-y-3 text-gray-600 text-sm">
              <li><Link href="#" className="hover:text-primary transition-colors">Quem Somos</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Carreiras</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Contato</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-black/10 pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Capmar. Todos os direitos reservados.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link href="#" className="hover:text-primary">Termos de Uso</Link>
            <Link href="#" className="hover:text-primary">Política de Privacidade</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
