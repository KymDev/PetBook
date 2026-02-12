import { Button } from "@/components/ui/button";
import { PetBookLogo } from "@/components/PetBookLogo";
import { useNavigate } from "react-router-dom";
import { Smartphone, Globe, Download, Heart, MapPin, ShieldCheck, ArrowRight, Star, Shield, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const LandingPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const features = [
    {
      icon: <MapPin className="w-8 h-8 text-pet-blue" />,
      title: t("landing.feature_map_title"),
      description: t("landing.feature_map_desc"),
      color: "bg-pet-blue/10"
    },
    {
      icon: <Heart className="w-8 h-8 text-pet-pink" />,
      title: t("landing.feature_social_title"),
      description: t("landing.feature_social_desc"),
      color: "bg-pet-pink/10"
    },
    {
      icon: <ShieldCheck className="w-8 h-8 text-pet-blue" />,
      title: t("landing.feature_health_title"),
      description: t("landing.feature_health_desc"),
      color: "bg-pet-blue/10"
    }
  ];

  return (
    <div className="min-h-screen bg-white text-foreground font-sans selection:bg-primary/20 overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-lg border-b border-gray-100">
        <div className="container mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
          <PetBookLogo size="md" />
          <div className="flex items-center gap-4">
            <LanguageSwitcher className="block" />
            <Button 
              variant="default" 
              className="font-bold rounded-full px-6 shadow-lg shadow-primary/20 hover:scale-105 transition-all"
              onClick={() => navigate("/auth")}
            >
              {t("landing.start_now")}
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-30">
            <div className="absolute top-20 left-10 w-72 h-72 bg-pet-blue/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-pet-pink/20 rounded-full blur-3xl animate-pulse delay-700" />
          </div>

          <div className="container mx-auto px-4 md:px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <h1 className="text-4xl md:text-7xl font-black tracking-tight mb-8 leading-[1.1]">
                <span className="text-foreground">O mundo do seu </span>
                <span className="gradient-text">pet em um só lugar</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
                {t("landing.hero_subtitle")}
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto h-16 px-10 rounded-full text-lg font-black shadow-2xl shadow-primary/30 hover:scale-105 transition-all"
                  onClick={() => navigate("/auth")}
                >
                  {t("landing.start_now")} <ArrowRight className="ml-2 w-6 h-6" />
                </Button>
                <a href="#download" className="w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="w-full sm:w-auto h-16 px-10 rounded-full text-lg font-bold border-2 hover:bg-gray-50 transition-all"
                  >
                    {t("landing.download_app")}
                  </Button>
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-gray-50/50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black mb-4">{t("landing.features_title")}</h2>
              <div className="w-20 h-1.5 bg-primary mx-auto rounded-full" />
            </div>
            <div className="grid md:grid-cols-3 gap-8 md:gap-12">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 }}
                  whileHover={{ y: -10 }}
                  className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 hover:border-primary/20 transition-all group"
                >
                  <div className={`w-16 h-16 ${feature.color} rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-lg">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Startup Section */}
        <section className="py-24 bg-white overflow-hidden">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col md:flex-row items-center gap-16">
              <motion.div 
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="flex-1"
              >
                <h2 className="text-3xl md:text-5xl font-black mb-8">{t("landing.startup_title")}</h2>
                <p className="text-xl text-muted-foreground leading-relaxed mb-10">
                  {t("landing.startup_desc")}
                </p>
                
                {/* Novos Destaques (Substituindo os números) */}
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-pet-blue/10 rounded-xl flex items-center justify-center shrink-0">
                      <Star className="w-6 h-6 text-pet-blue" />
                    </div>
                    <div>
                      <h4 className="font-black text-lg">Comunidade Ativa</h4>
                      <p className="text-muted-foreground">Tutores engajados compartilhando experiências reais todos os dias.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-pet-pink/10 rounded-xl flex items-center justify-center shrink-0">
                      <Shield className="w-6 h-6 text-pet-pink" />
                    </div>
                    <div>
                      <h4 className="font-black text-lg">Segurança em Primeiro Lugar</h4>
                      <p className="text-muted-foreground">Seus dados e as informações de saúde do seu pet protegidos com criptografia.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <Zap className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-black text-lg">Tecnologia de Ponta</h4>
                      <p className="text-muted-foreground">Sincronização em tempo real entre todos os seus dispositivos.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="flex-1 relative"
              >
                <div className="relative z-10 rounded-[3rem] overflow-hidden shadow-2xl">
                  <img 
                    src="https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&q=80&w=1000" 
                    alt="Startup" 
                    className="w-full h-auto"
                  />
                </div>
                <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-pet-pink rounded-full -z-10 opacity-20 blur-2xl" />
                <div className="absolute -top-6 -left-6 w-48 h-48 bg-pet-blue rounded-full -z-10 opacity-20 blur-2xl" />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Download Section */}
        <section id="download" className="container mx-auto px-4 md:px-6 py-24 md:py-32 text-center">
          <h2 className="text-3xl md:text-5xl font-black mb-16">{t("landing.download_title")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Android Card */}
            <motion.div 
              whileHover={{ y: -15 }}
              className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-gray-200 border border-gray-100 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-bl-full -z-10 transition-all group-hover:scale-150" />
              <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
                <Smartphone className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-black mb-3">Android</h3>
              <p className="text-muted-foreground mb-10">{t("landing.download_android_desc")}</p>
              <Button 
                className="w-full h-14 rounded-2xl bg-black hover:bg-gray-800 text-white font-black text-lg shadow-xl"
                onClick={() => window.location.href = "/PetBook.apk"}
              >
                <Download className="mr-2 w-6 h-6" /> APK
              </Button>
            </motion.div>

            {/* iOS Card */}
            <motion.div 
              whileHover={{ y: -15 }}
              className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-gray-200 border border-gray-100 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full -z-10 transition-all group-hover:scale-150" />
              <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
                <Smartphone className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-black mb-3">iOS</h3>
              <p className="text-muted-foreground mb-10">{t("landing.download_ios_desc")}</p>
              <Button 
                variant="outline"
                className="w-full h-14 rounded-2xl border-2 font-black text-lg opacity-40 cursor-not-allowed"
                disabled
              >
                App Store
              </Button>
            </motion.div>

            {/* Web Card */}
            <motion.div 
              whileHover={{ y: -15 }}
              className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-gray-200 border border-primary/10 relative overflow-hidden group sm:col-span-2 lg:col-span-1"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10 transition-all group-hover:scale-150" />
              <div className="w-20 h-20 bg-primary/5 rounded-3xl flex items-center justify-center mx-auto mb-8">
                <Globe className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-2xl font-black mb-3">Web App</h3>
              <p className="text-muted-foreground mb-10">{t("landing.download_web_desc")}</p>
              <Button 
                variant="outline"
                className="w-full h-14 rounded-2xl border-2 border-primary text-primary hover:bg-primary hover:text-white font-black text-lg transition-all shadow-lg shadow-primary/10"
                onClick={() => navigate("/auth")}
              >
                {t("landing.start_now")}
              </Button>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-gray-100 py-16">
        <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="flex flex-col items-center md:items-start gap-4">
            <PetBookLogo size="md" />
            <p className="text-muted-foreground text-center md:text-left max-w-xs">
              {t("landing.hero_subtitle").split('.')[0]}.
            </p>
          </div>
          <div className="flex flex-col items-center md:items-end gap-6">
            <div className="flex gap-8 font-bold text-sm uppercase tracking-widest">
              <a href="#" className="hover:text-primary transition-colors">Termos</a>
              <a href="#" className="hover:text-primary transition-colors">Privacidade</a>
              <a href="#" className="hover:text-primary transition-colors">Contato</a>
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              {t("landing.footer_rights")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
