import { Button } from "@/components/ui/button";
import { PetBookLogo } from "@/components/PetBookLogo";
import { useNavigate } from "react-router-dom";
import { 
  Smartphone, 
  Globe, 
  Download, 
  Heart, 
  MapPin, 
  ShieldCheck, 
  ArrowRight, 
  Star, 
  Shield, 
  Zap, 
  PawPrint, 
  Sparkles,
  Menu,
  X,
  ChevronRight,
  Dog,
  Cat,
  Bird,
  Rabbit,
  Users,
  Camera,
  MessageCircle
} from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useState, useEffect } from "react";

const LandingPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  useEffect(() => {
    const unsubscribe = scrollY.onChange((latest) => {
      setIsScrolled(latest > 50);
    });
    return () => unsubscribe();
  }, [scrollY]);

  const handleDownloadAPK = () => {
    // Método mais seguro para download que evita bloqueios comuns de navegadores
    const apkUrl = '/PetBook.apk';
    const link = document.createElement('a');
    link.href = apkUrl;
    link.setAttribute('download', 'PetBook.apk');
    link.setAttribute('rel', 'noopener noreferrer');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const features = [
    {
      icon: <MapPin className="w-7 h-7" />,
      title: t("landing.feature_map_title"),
      description: t("landing.feature_map_desc"),
      gradient: "from-pet-blue to-cyan-400",
      bgLight: "bg-pet-blue-light",
      iconColor: "text-pet-blue"
    },
    {
      icon: <Heart className="w-7 h-7" />,
      title: t("landing.feature_social_title"),
      description: t("landing.feature_social_desc"),
      gradient: "from-pet-pink to-rose-400",
      bgLight: "bg-pet-pink-light",
      iconColor: "text-pet-pink"
    },
    {
      icon: <ShieldCheck className="w-7 h-7" />,
      title: t("landing.feature_health_title"),
      description: t("landing.feature_health_desc"),
      gradient: "from-purple-500 to-indigo-400",
      bgLight: "bg-purple-50",
      iconColor: "text-purple-600"
    }
  ];

  const benefits = [
    {
      icon: <Users className="w-6 h-6" />,
      title: t("common.active_community"),
      description: t("common.active_community_desc"),
      gradient: "from-pet-blue to-cyan-400",
      bgLight: "bg-pet-blue-light",
      image: "/images/community.jpg"
    },
    {
      icon: <PawPrint className="w-6 h-6" />,
      title: t("common.more_than_10_species"),
      description: t("common.more_than_10_species_desc"),
      gradient: "from-pet-pink to-rose-400",
      bgLight: "bg-pet-pink-light",
      image: "/images/hero-pet.jpg"
    },
    {
      icon: <Camera className="w-6 h-6" />,
      title: t("common.share_experiences"),
      description: t("common.share_experiences_desc"),
      gradient: "from-violet-500 to-purple-400",
      bgLight: "bg-violet-50",
      image: "/images/moments.jpg"
    }
  ];

  const petTypes = [
    { icon: <Dog className="w-5 h-5" />, name: t("common.dogs"), color: "text-pet-blue", bg: "bg-pet-blue-light" },
    { icon: <Cat className="w-5 h-5" />, name: t("common.cats"), color: "text-orange-600", bg: "bg-orange-50" },
    { icon: <Bird className="w-5 h-5" />, name: t("common.birds"), color: "text-cyan-600", bg: "bg-cyan-50" },
    { icon: <Rabbit className="w-5 h-5" />, name: t("common.rodents"), color: "text-amber-600", bg: "bg-amber-50" }
  ];

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  };

  return (
    <div className="min-h-screen bg-white text-foreground font-sans overflow-x-hidden selection:bg-primary/20">
      {/* Header Moderno */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className={`fixed top-0 w-full z-50 transition-all duration-500 ${
          isScrolled 
            ? 'bg-white/80 backdrop-blur-xl border-b border-gray-100/80 shadow-sm' 
            : 'bg-white/0 backdrop-blur-none'
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="relative"
            >
              <PetBookLogo size="md" showText={true} />
            </motion.div>

            <div className="hidden md:flex items-center gap-2">
              <LanguageSwitcher className="mr-2" />
              <Button 
                variant="ghost" 
                className="rounded-full px-6 hover:bg-gray-100 transition-all"
                onClick={() => navigate("/auth")}
              >
                {t("landing.login")}
              </Button>
              <Button 
                className="rounded-full bg-gradient-to-r from-pet-blue to-pet-pink hover:opacity-90 shadow-lg shadow-pet-blue/25 hover:shadow-xl transition-all duration-300 px-8 font-semibold"
                onClick={() => navigate("/auth")}
              >
                {t("landing.start_now")}
              </Button>
            </div>

            <button 
              className="md:hidden w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <motion.div 
          initial={false}
          animate={mobileMenuOpen ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
          className="md:hidden overflow-hidden bg-white/95 backdrop-blur-xl border-b border-gray-100"
        >
          <div className="container mx-auto px-6 py-6 flex flex-col gap-4">
            <LanguageSwitcher className="w-full justify-start" />
            <Button 
              variant="ghost" 
              className="w-full justify-start rounded-xl h-12"
              onClick={() => navigate("/auth")}
            >
              {t("landing.login")}
            </Button>
            <Button 
              className="w-full rounded-xl bg-gradient-to-r from-pet-blue to-pet-pink h-12 font-semibold"
              onClick={() => {
                navigate("/auth");
                setMobileMenuOpen(false);
              }}
            >
              {t("landing.start_now")}
            </Button>
          </div>
        </motion.div>
      </motion.header>

      <main className="relative">
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 -left-4 w-96 h-96 bg-pet-blue rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob" />
            <div className="absolute top-0 -right-4 w-96 h-96 bg-pet-pink rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000" />
            <div className="absolute -bottom-8 left-20 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000" />
          </div>

          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-pet-blue/10 to-pet-pink/10 rounded-full px-4 py-2 mb-8"
                >
                  <PawPrint className="w-4 h-4 text-pet-blue" />
                  <span className="text-sm font-semibold text-pet-blue">{t("common.welcome_to_petbook")}</span>
                </motion.div>

                <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight mb-6 sm:mb-8 leading-[1.1]">
                  <span className="bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    {t("landing.hero_title").split("pet")[0]}
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-pet-blue via-pet-blue/80 to-pet-pink bg-clip-text text-transparent">
                    pet {t("landing.hero_title").split("pet")[1]}
                  </span>
                </h1>
                
                <p className="text-lg sm:text-xl text-gray-600 mb-8 sm:mb-12 leading-relaxed max-w-xl">
                  {t("landing.hero_subtitle")}
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    size="lg" 
                    className="group h-14 sm:h-16 px-8 sm:px-10 rounded-full bg-gradient-to-r from-pet-blue to-pet-blue/80 hover:from-pet-blue/90 hover:to-pet-blue text-white font-bold text-lg shadow-2xl shadow-pet-blue/30 hover:shadow-pet-blue/40 transition-all duration-300"
                    onClick={() => navigate("/auth")}
                  >
                    {t("landing.start_now")}
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="h-14 sm:h-16 px-8 sm:px-10 rounded-full border-2 font-bold text-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
                    onClick={() => document.getElementById('download')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    {t("landing.download_app")}
                  </Button>
                </div>

                {/* Trust Indicators */}
                <div className="mt-12 sm:mt-16 flex flex-wrap items-center gap-6 sm:gap-8">
                  <div className="flex -space-x-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-4 border-white bg-gray-100 overflow-hidden shadow-sm">
                        <img src={`https://i.pravatar.cc/150?u=pet${i}`} alt="User" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <span className="text-sm font-medium text-gray-500 mt-1">
                      {t("common.active_community")}
                    </span>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="relative"
              >
                <div className="relative z-10 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-pet-blue/20 border-8 border-white">
                  <img 
                    src="/images/hero-pet.jpg" 
                    alt="Happy Pet" 
                    className="w-full h-full object-cover aspect-[4/5] sm:aspect-square lg:aspect-[4/5]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  
                  {/* Floating Card */}
                  <motion.div 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-pet-blue flex items-center justify-center text-white shadow-lg">
                        <Heart className="w-6 h-6 fill-current" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{t("landing.feature_health_title")}</p>
                        <p className="text-xs text-gray-500">{t("landing.feature_health_desc")}</p>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Decorative elements */}
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-pet-pink/20 rounded-full blur-2xl" />
                <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-pet-blue/20 rounded-full blur-2xl" />
                
                {/* Pet Types Badges */}
                <div className="absolute -right-4 top-1/4 flex flex-col gap-3">
                  {petTypes.map((type, i) => (
                    <motion.div
                      key={type.name}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1 + (i * 0.1) }}
                      className={`${type.bg} ${type.color} p-3 rounded-2xl shadow-lg backdrop-blur-sm border border-white/50 flex items-center gap-2 font-bold text-sm`}
                    >
                      {type.icon}
                      <span className="hidden sm:inline">{type.name}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-gray-50/50 relative overflow-hidden">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <motion.h2 
                {...fadeInUp}
                className="text-3xl sm:text-4xl lg:text-5xl font-black mb-6"
              >
                {t("landing.features_title")}
              </motion.h2>
              <motion.p 
                {...fadeInUp}
                transition={{ delay: 0.2 }}
                className="text-lg text-gray-600"
              >
                {t("health.subtitle")}
              </motion.p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2 }}
                  whileHover={{ y: -10 }}
                  className="group bg-white p-8 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100"
                >
                  <div className={`w-16 h-16 rounded-2xl ${feature.bgLight} ${feature.iconColor} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-24 overflow-hidden">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-24">
              {benefits.map((benefit, i) => (
                <div key={benefit.title} className={`grid lg:grid-cols-2 gap-16 items-center ${i % 2 === 1 ? 'lg:direction-rtl' : ''}`}>
                  <motion.div 
                    initial={{ opacity: 0, x: i % 2 === 0 ? -50 : 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className={i % 2 === 1 ? 'lg:order-2' : ''}
                  >
                    <div className={`w-14 h-14 rounded-2xl ${benefit.bgLight} flex items-center justify-center mb-6`}>
                      {benefit.icon}
                    </div>
                    <h3 className="text-3xl sm:text-4xl font-black mb-6 leading-tight">
                      {benefit.title}
                    </h3>
                    <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                      {benefit.description}
                    </p>
                    <Button 
                      variant="outline" 
                      className="rounded-full px-8 h-12 font-bold hover:bg-gray-50 transition-all"
                      onClick={() => navigate("/auth")}
                    >
                      {t("common.see_more")}
                    </Button>
                  </motion.div>
                  
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className={`relative ${i % 2 === 1 ? 'lg:order-1' : ''}`}
                  >
                    <div className="rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white aspect-video lg:aspect-square">
                      <img src={benefit.image} alt={benefit.title} className="w-full h-full object-cover" />
                    </div>
                    <div className={`absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-r ${benefit.gradient} opacity-10 blur-3xl rounded-full`} />
                  </motion.div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* App Download Section */}
        <section id="download" className="py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-[3rem] p-8 sm:p-16 lg:p-24 relative overflow-hidden">
              {/* Background patterns */}
              <div className="absolute top-0 right-0 w-1/2 h-full bg-white/5 skew-x-12 translate-x-1/4" />
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-pet-blue/20 rounded-full blur-3xl" />
              
              <div className="grid lg:grid-cols-2 gap-16 items-center relative z-10">
                <div>
                  <h2 className="text-3xl sm:text-5xl font-black text-white mb-8 leading-tight">
                    {t("landing.download_title")}
                  </h2>
                  <p className="text-xl text-gray-400 mb-12 leading-relaxed">
                    {t("landing.hero_subtitle")}
                  </p>
                  
                  <div className="grid sm:grid-cols-2 gap-6">
                    <motion.div 
                      whileHover={{ y: -5 }}
                      className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10"
                    >
                      <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center text-white mb-4">
                        <Smartphone className="w-6 h-6" />
                      </div>
                      <h4 className="text-white font-bold mb-2">Android</h4>
                      <p className="text-sm text-gray-400 mb-4">{t("landing.download_android_desc")}</p>
                      <Button 
                        className="w-full bg-white text-gray-900 hover:bg-gray-100 font-bold rounded-xl"
                        onClick={handleDownloadAPK}
                      >
                        {t("landing.download_safe_apk")}
                      </Button>
                    </motion.div>

                    <motion.div 
                      whileHover={{ y: -5 }}
                      className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10 opacity-60"
                    >
                      <div className="w-12 h-12 bg-gray-600 rounded-2xl flex items-center justify-center text-white mb-4">
                        <Globe className="w-6 h-6" />
                      </div>
                      <h4 className="text-white font-bold mb-2">iOS</h4>
                      <p className="text-sm text-gray-400 mb-4">{t("landing.download_ios_desc")}</p>
                      <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 rounded-xl" disabled>
                        {t("landing.available_soon")}
                      </Button>
                    </motion.div>
                  </div>

                  <div className="mt-8 p-6 bg-pet-blue/10 rounded-3xl border border-pet-blue/20 flex items-center gap-4">
                    <div className="w-12 h-12 bg-pet-blue rounded-2xl flex items-center justify-center text-white shrink-0">
                      <Globe className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-bold text-sm">Web App</h4>
                      <p className="text-xs text-gray-400">{t("landing.download_web_desc")}</p>
                    </div>
                    <Button 
                      size="sm" 
                      className="bg-pet-blue hover:bg-pet-blue/80 text-white rounded-xl"
                      onClick={() => navigate("/auth")}
                    >
                      {t("landing.access_now")}
                    </Button>
                  </div>
                </div>

                <div className="relative hidden lg:block">
                  <motion.div
                    animate={{ y: [0, -20, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    className="relative z-10"
                  >
                    <img src="/images/moments.jpg" alt="App Preview" className="w-[80%] mx-auto rounded-[3rem] shadow-2xl border-4 border-gray-800" />
                  </motion.div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-pet-blue/20 rounded-full blur-[120px] -z-10" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white pt-24 pb-12 border-t border-gray-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-12">
            <div className="col-span-2">
              <PetBookLogo size="md" showText={true} />
              <p className="mt-6 text-gray-500 leading-relaxed max-w-sm">
                {t("landing.hero_subtitle")}
              </p>
              <div className="flex gap-4 mt-8">
                {['Instagram', 'Facebook', 'Twitter'].map((social) => (
                  <a key={social} href="#" className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-pet-blue hover:text-white transition-all">
                    <span className="sr-only">{social}</span>
                    <Heart className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>

            <div className="lg:col-span-1">
              <h4 className="font-bold text-lg mb-6">Links Rápidos</h4>
              <ul className="space-y-4">
                {[
                  { key: "landing.about_us", label: t("landing.about_us") },
                  { key: "landing.features", label: t("landing.features") },
                  { key: "common.services", label: t("common.services") },
                  { key: "landing.blog", label: t("landing.blog") }
                ].map((item) => (
                  <li key={item.key}>
                    <a 
                      href="#" 
                      className="text-gray-600 hover:text-pet-blue transition-colors flex items-center gap-2 group"
                    >
                      <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-1">
              <h4 className="font-bold text-lg mb-6">{t("landing.legal")}</h4>
              <ul className="space-y-4">
                {[
                  { key: "landing.terms_of_use", label: t("landing.terms_of_use") },
                  { key: "landing.privacy_policy", label: t("landing.privacy_policy") },
                  { key: "landing.cookies", label: t("landing.cookies") },
                  { key: "landing.contact", label: t("landing.contact") }
                ].map((item) => (
                  <li key={item.key}>
                    <a 
                      href="#" 
                      className="text-gray-600 hover:text-pet-blue transition-colors flex items-center gap-2 group"
                    >
                      <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-600 text-sm">
              {t("landing.footer_rights")}
            </p>
            <div className="flex gap-6 text-sm text-gray-500">
              <span className="bg-pet-blue/10 text-pet-blue px-3 py-1 rounded-full font-semibold">{t("common.beta_version")}</span>
              <span>•</span>
              <span>{t("common.made_with_heart")}</span>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
