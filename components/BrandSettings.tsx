
import React, { useState, useEffect } from 'react';
import { 
  getBrandSettings, 
  updateBrandSettings, 
  optimizeImage, 
  uploadBrandFile, 
  deleteBrandFile,
  getAds,
  saveAd,
  deleteAd,
  getUserDashboardBanner,
  saveUserDashboardBanner,
  deleteUserDashboardBanner,
  getUserDashboardSocial,
  saveUserDashboardSocial,
  DEFAULT_SOCIAL_SETTINGS
} from '../services/firebaseService';
import { BrandSettings as IBrandSettings, AdBanner, VoiceName, UserDashboardBanner, UserDashboardSocial, SocialCard } from '../types';

const VOICE_OPTIONS: VoiceName[] = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];

const BrandSettings: React.FC = () => {
  const [settings, setSettings] = useState<IBrandSettings | null>(null);
  const [banner, setBanner] = useState<UserDashboardBanner | null>(null);
  const [social, setSocial] = useState<UserDashboardSocial | null>(null);
  const [ads, setAds] = useState<AdBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adTab, setAdTab] = useState<'list' | 'create'>('list');

  const [adForm, setAdForm] = useState<Partial<AdBanner>>({
    status: 'inactive',
    timing: { showPopupAfterSeconds: 5, closeButtonAfterSeconds: 10 },
    ctaButton: { text: 'Learn More', link: 'https://' }
  });
  const [adFile, setAdFile] = useState<File | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const [s, a, b, soc] = await Promise.all([
      getBrandSettings(), 
      getAds(), 
      getUserDashboardBanner(),
      getUserDashboardSocial()
    ]);
    setSettings(s);
    setAds(a);
    setBanner(b);
    setSocial(soc);
    setLoading(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;
    setSaving(true);
    try {
      const optimized = await optimizeImage(file, 400);
      const { storagePath, downloadURL } = await uploadBrandFile(`brand/logo/logo_${Date.now()}.webp`, optimized);
      if (settings.logo.storagePath) await deleteBrandFile(settings.logo.storagePath);
      await updateBrandSettings({ logo: { ...settings.logo, storagePath, downloadURL, enabled: true } });
      await loadAll();
    } catch (err) {
      alert("Logo upload failed");
    } finally {
      setSaving(false);
    }
  };

  const handleWatermarkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;
    setSaving(true);
    try {
      const optimized = await optimizeImage(file, 800, 0.5);
      const { storagePath, downloadURL } = await uploadBrandFile(`brand/watermark/watermark_${Date.now()}.webp`, optimized);
      if (settings.watermark.storagePath) await deleteBrandFile(settings.watermark.storagePath);
      await updateBrandSettings({ watermark: { ...settings.watermark, storagePath, downloadURL, enabled: true } });
      await loadAll();
    } catch (err) {
      alert("Watermark upload failed");
    } finally {
      setSaving(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !banner) return;
    
    if (file.size > 3 * 1024 * 1024) {
      alert("Raw file size must be under 3MB.");
      return;
    }

    setSaving(true);
    try {
      const optimized = await optimizeImage(file, 1400, 0.8);
      const { storagePath, downloadURL } = await uploadBrandFile(`brand/userDashboardBanner/banner_${Date.now()}.webp`, optimized);
      
      if (banner.imagePath) await deleteBrandFile(banner.imagePath);
      
      await saveUserDashboardBanner({
        imageUrl: downloadURL,
        imagePath: storagePath,
        enabled: true
      });
      await loadAll();
    } catch (err) {
      alert("Banner upload failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSettings = async (updates: Partial<IBrandSettings>) => {
    if (!settings) return;
    setSaving(true);
    await updateBrandSettings(updates);
    await loadAll();
    setSaving(false);
  };

  const handleSaveSocial = async () => {
    if (!social) return;
    setSaving(true);
    try {
      await saveUserDashboardSocial(social);
      alert("Social cards saved successfully.");
    } catch (e) {
      alert("Failed to save social cards.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetSocial = async () => {
    if (!window.confirm("Reset all social cards to defaults?")) return;
    setSaving(true);
    try {
      await saveUserDashboardSocial(DEFAULT_SOCIAL_SETTINGS);
      setSocial(DEFAULT_SOCIAL_SETTINGS);
      alert("Social settings reset.");
    } catch (e) {
      alert("Reset failed.");
    } finally {
      setSaving(false);
    }
  };

  const updateSocialCard = (idx: number, updates: Partial<SocialCard>) => {
    if (!social) return;
    const newCards = [...social.cards];
    newCards[idx] = { ...newCards[idx], ...updates };
    setSocial({ ...social, cards: newCards });
  };

  const handleSaveAd = async () => {
    if (!adFile && !adForm.id) {
      alert("Please select a banner image");
      return;
    }
    setSaving(true);
    try {
      let bannerData = adForm.banner || { storagePath: null, downloadURL: null };
      if (adFile) {
        const large = await optimizeImage(adFile, 1200);
        const medium = await optimizeImage(adFile, 800);
        const small = await optimizeImage(adFile, 400);
        const timestamp = Date.now();
        const [lRes, mRes, sRes] = await Promise.all([
          uploadBrandFile(`brand/ads/banner_large_${timestamp}.webp`, large),
          uploadBrandFile(`brand/ads/banner_medium_${timestamp}.webp`, medium),
          uploadBrandFile(`brand/ads/banner_small_${timestamp}.webp`, small)
        ]);
        bannerData = {
          storagePath: lRes.storagePath,
          downloadURL: lRes.downloadURL,
          variants: { largeURL: lRes.downloadURL, mediumURL: mRes.downloadURL, smallURL: sRes.downloadURL }
        };
      }
      await saveAd({ ...adForm, banner: bannerData });
      setAdTab('list');
      setAdForm({ status: 'inactive', timing: { showPopupAfterSeconds: 5, closeButtonAfterSeconds: 10 }, ctaButton: { text: 'Learn More', link: 'https://' } });
      setAdFile(null);
      await loadAll();
    } catch (err) {
      alert("Failed to save ad");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) return <div className="p-12 text-center text-slate-400">Loading Brand Identity...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Brand Settings</h2>
          <p className="text-slate-500">Master identity controls for SYAN Exam Recalls.</p>
        </div>
        {saving && <div className="flex items-center gap-2 text-blue-600 font-bold text-xs"><div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div> SYNCING...</div>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-800">1. Application Logo</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs font-bold text-slate-400 uppercase">Enabled</span>
              <input type="checkbox" checked={settings.logo.enabled} onChange={e => handleUpdateSettings({ logo: { ...settings.logo, enabled: e.target.checked } })} className="w-5 h-5 rounded-md text-blue-600 focus:ring-blue-500" />
            </label>
          </div>
          <div className="aspect-video bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center p-8 overflow-hidden">
            {settings.logo.downloadURL ? <img src={settings.logo.downloadURL} className="max-h-full max-w-full object-contain drop-shadow-md" alt="Logo Preview" /> : <span className="text-slate-400 text-sm italic">No Logo Uploaded</span>}
          </div>
          <div className="flex gap-4">
            <input type="file" id="logo-up" className="hidden" accept="image/*" onChange={handleLogoUpload} />
            <label htmlFor="logo-up" className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold text-center cursor-pointer hover:bg-black transition-all">{settings.logo.downloadURL ? 'Change Logo' : 'Upload Logo'}</label>
            {settings.logo.downloadURL && <button onClick={async () => { if (settings.logo.storagePath) await deleteBrandFile(settings.logo.storagePath); await updateBrandSettings({ logo: { ...settings.logo, storagePath: null, downloadURL: null, enabled: false } }); await loadAll(); }} className="px-6 py-4 bg-red-50 text-red-600 font-bold rounded-2xl border border-red-100">Delete</button>}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-800">2. Quiz Watermark</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs font-bold text-slate-400 uppercase">Enabled</span>
              <input type="checkbox" checked={settings.watermark.enabled} onChange={e => handleUpdateSettings({ watermark: { ...settings.watermark, enabled: e.target.checked } })} className="w-5 h-5 rounded-md text-blue-600 focus:ring-blue-500" />
            </label>
          </div>
          <div className="relative aspect-video bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center">
            {settings.watermark.downloadURL ? <div className="absolute inset-0 pointer-events-none flex items-center justify-center"><img src={settings.watermark.downloadURL} style={{ opacity: (settings.watermark.opacity || 30) / 100 }} className="w-3/4 object-contain rotate-[-30deg]" alt="Watermark Preview" /></div> : <span className="text-slate-400 text-sm italic">No Watermark Uploaded</span>}
            <div className="text-xs font-bold text-slate-300">WATERMARK PREVIEW AREA</div>
          </div>
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase">Opacity: {settings.watermark.opacity}%</label>
            <input type="range" min="5" max="100" value={settings.watermark.opacity || 30} onChange={e => handleUpdateSettings({ watermark: { ...settings.watermark, opacity: parseInt(e.target.value) } })} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
          </div>
          <div className="flex gap-4">
            <input type="file" id="wm-up" className="hidden" accept="image/*" onChange={handleWatermarkUpload} />
            <label htmlFor="wm-up" className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold text-center cursor-pointer hover:bg-black transition-all">{settings.watermark.downloadURL ? 'Change Watermark' : 'Upload Watermark'}</label>
            {settings.watermark.downloadURL && <button onClick={async () => { if (settings.watermark.storagePath) await deleteBrandFile(settings.watermark.storagePath); await updateBrandSettings({ watermark: { ...settings.watermark, storagePath: null, downloadURL: null, enabled: false } }); await loadAll(); }} className="px-6 py-4 bg-red-50 text-red-600 font-bold rounded-2xl border border-red-100">Delete</button>}
          </div>
        </div>

        {/* User Dashboard Banner Section */}
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-800">3. User Dashboard Banner</h3>
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${banner?.published ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                {banner?.published ? 'PUBLISHED' : 'UNPUBLISHED'}
              </span>
              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-slate-500 uppercase">Visible</span>
                <input 
                  type="checkbox" 
                  checked={banner?.published || false} 
                  onChange={async e => {
                    await saveUserDashboardBanner({ published: e.target.checked, enabled: true });
                    loadAll();
                  }} 
                  className="w-5 h-5 rounded-md text-teal-600 focus:ring-teal-500" 
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="aspect-[21/9] bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center relative group">
                {banner?.imageUrl ? (
                  <img src={banner.imageUrl} className="w-full h-full object-cover" alt="Banner Preview" />
                ) : (
                  <span className="text-slate-400 text-sm italic">No banner uploaded</span>
                )}
                {saving && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <div className="flex gap-4">
                <input type="file" id="banner-up" className="hidden" accept="image/*" onChange={handleBannerUpload} />
                <label htmlFor="banner-up" className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold text-center cursor-pointer hover:bg-black transition-all">
                  {banner?.imageUrl ? 'Change Banner' : 'Upload Banner'}
                </label>
                {banner?.imageUrl && (
                  <button 
                    onClick={async () => {
                      if(confirm("Delete this banner?")) {
                        await deleteUserDashboardBanner(banner.imagePath);
                        loadAll();
                      }
                    }} 
                    className="px-6 py-4 bg-red-50 text-red-600 font-bold rounded-2xl border border-red-100"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Button Text</label>
                  <input 
                    type="text" 
                    value={banner?.buttonText || ''} 
                    onChange={e => setBanner(b => b ? {...b, buttonText: e.target.value} : null)} 
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold" 
                    placeholder="e.g. Join the Community"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Button Link</label>
                  <input 
                    type="url" 
                    value={banner?.buttonLink || ''} 
                    onChange={e => setBanner(b => b ? {...b, buttonLink: e.target.value} : null)} 
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-mono text-sm" 
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                 <div>
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                       <input type="checkbox" checked={banner?.viewButtonEnabled} onChange={e => setBanner(b => b ? {...b, viewButtonEnabled: e.target.checked} : null)} className="w-4 h-4 rounded text-blue-600" />
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enable "View" Button</span>
                    </label>
                    <input 
                      type="text" 
                      value={banner?.viewButtonText || ''} 
                      onChange={e => setBanner(b => b ? {...b, viewButtonText: e.target.value} : null)} 
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" 
                      placeholder="e.g. View"
                    />
                 </div>
              </div>

              <button 
                onClick={async () => {
                  if(!banner) return;
                  await saveUserDashboardBanner({ 
                    buttonText: banner.buttonText, 
                    buttonLink: banner.buttonLink,
                    viewButtonEnabled: banner.viewButtonEnabled,
                    viewButtonText: banner.viewButtonText
                  });
                  alert("Banner configuration updated.");
                  loadAll();
                }}
                className="w-full py-4 bg-teal-600 text-white font-bold rounded-2xl shadow-xl hover:bg-teal-700 transition-all active:scale-95"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>

        {/* Social Cards Section */}
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6 lg:col-span-2">
           <div className="flex items-center justify-between">
              <div>
                 <h3 className="text-xl font-bold text-slate-800">4. User Dashboard Social Cards</h3>
                 <p className="text-xs text-slate-500">Configure quick-access links on the user dashboard.</p>
              </div>
              <div className="flex gap-2">
                 <button onClick={handleResetSocial} className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200">Reset to Defaults</button>
                 <button onClick={handleSaveSocial} disabled={saving} className="px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-black">{saving ? 'SAVING...' : 'SAVE SOCIAL CARDS'}</button>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {social?.cards.map((card, idx) => (
                <div key={card.id} className={`p-6 rounded-3xl border transition-all ${card.enabled ? 'border-blue-100 bg-blue-50/30' : 'border-slate-100 bg-slate-50/50'}`}>
                   <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm">
                         {card.id === 'facebook' ? '👥' : card.id === 'whatsapp' ? '💬' : '📺'}
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active</span>
                         <input type="checkbox" checked={card.enabled} onChange={e => updateSocialCard(idx, { enabled: e.target.checked })} className="w-4 h-4 rounded text-blue-600" />
                      </label>
                   </div>
                   <div className="space-y-3">
                      <div>
                         <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Card Title</label>
                         <input type="text" value={card.title} onChange={e => updateSocialCard(idx, { title: e.target.value })} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800" />
                      </div>
                      <div>
                         <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Subtitle</label>
                         <input type="text" value={card.subtitle} onChange={e => updateSocialCard(idx, { subtitle: e.target.value })} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-[10px] text-slate-600" />
                      </div>
                      <div>
                         <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">URL Link</label>
                         <input type="text" value={card.link} onChange={e => updateSocialCard(idx, { link: e.target.value })} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-[9px] font-mono text-blue-500" placeholder="https://..." />
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-800">5. AI Tutor Voice Settings</h3>
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-4 py-2 rounded-xl">
              <span className="text-xs font-bold text-slate-500 uppercase">Voice Enabled</span>
              <input type="checkbox" checked={settings.voice?.enabled || false} onChange={e => handleUpdateSettings({ voice: { ...settings.voice, enabled: e.target.checked, voiceName: settings.voice?.voiceName || 'Kore' } })} className="w-5 h-5 rounded-md text-blue-600 focus:ring-blue-500" />
            </label>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {VOICE_OPTIONS.map(v => (
              <button 
                key={v}
                onClick={() => handleUpdateSettings({ voice: { ...settings.voice, voiceName: v } })}
                className={`p-4 rounded-2xl border-2 transition-all ${settings.voice?.voiceName === v ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' : 'border-slate-100 hover:bg-slate-50 text-slate-500'}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-8">
        <div className="flex items-center justify-between border-b border-slate-50 pb-6">
          <div>
            <h3 className="text-2xl font-bold text-slate-800">6. Advertisement Banners</h3>
            <p className="text-sm text-slate-500">Control high-impact clinical popups.</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase">Ad Popup System</span>
            <input type="checkbox" checked={settings.ads.enabled} onChange={e => handleUpdateSettings({ ads: { ...settings.ads, enabled: e.target.checked } })} className="w-5 h-5 rounded-md text-emerald-600 focus:ring-emerald-500" />
          </label>
        </div>

        <div className="flex gap-4 border-b border-slate-50">
          <button onClick={() => setAdTab('list')} className={`pb-4 px-2 font-bold text-sm transition-all border-b-2 ${adTab === 'list' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Ad Library</button>
          <button onClick={() => setAdTab('create')} className={`pb-4 px-2 font-bold text-sm transition-all border-b-2 ${adTab === 'create' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Create New Ad</button>
        </div>

        {adTab === 'list' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {ads.map(ad => (
              <div key={ad.id} className={`group relative rounded-2xl border overflow-hidden transition-all ${settings.ads.activeAdId === ad.id ? 'border-blue-600 ring-2 ring-blue-100' : 'border-slate-100 hover:border-slate-200'}`}>
                <div className="aspect-video bg-slate-900"><img src={ad.banner.downloadURL || ''} className="w-full h-full object-cover" alt="Ad Banner" /></div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-slate-800 truncate pr-4">{ad.ctaButton.text}</h4>
                    {settings.ads.activeAdId === ad.id && <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase">Active</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleUpdateSettings({ ads: { ...settings.ads, activeAdId: ad.id } })} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${settings.ads.activeAdId === ad.id ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-slate-900 text-white hover:bg-black'}`}>{settings.ads.activeAdId === ad.id ? 'Current' : 'Set as Active'}</button>
                    <button onClick={async () => { if (confirm("Delete this advertisement?")) { await deleteAd(ad.id, ad.banner.storagePath); if (settings.ads.activeAdId === ad.id) await handleUpdateSettings({ ads: { ...settings.ads, activeAdId: null } }); await loadAll(); } }} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors">🗑</button>
                  </div>
                </div>
              </div>
            ))}
            {ads.length === 0 && <div className="col-span-full py-20 text-center text-slate-400 italic">No ads in library.</div>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-slide-up">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">1. Banner Image</label>
                <div className="relative aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-4 group">
                  {adFile ? <img src={URL.createObjectURL(adFile)} className="max-h-full object-contain" alt="Selected" /> : <div className="text-center"><div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🖼</div><p className="text-xs text-slate-500 font-bold">CLICK TO UPLOAD BANNER</p></div>}
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={e => setAdFile(e.target.files?.[0] || null)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Popup Delay (Sec)</label>
                  <input type="number" value={adForm.timing?.showPopupAfterSeconds} onChange={e => setAdForm({...adForm, timing: {...adForm.timing!, showPopupAfterSeconds: parseInt(e.target.value)}})} className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Close Delay (Sec)</label>
                  <input type="number" value={adForm.timing?.closeButtonAfterSeconds} onChange={e => setAdForm({...adForm, timing: {...adForm.timing!, closeButtonAfterSeconds: parseInt(e.target.value)}})} className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="space-y-4 pt-4 border-t border-slate-50">
                <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest">CTA Button Text</label><input type="text" placeholder="e.g. Enroll Now" value={adForm.ctaButton?.text} onChange={e => setAdForm({...adForm, ctaButton: {...adForm.ctaButton!, text: e.target.value}})} className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" /></div>
                <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Destination URL</label><input type="url" placeholder="https://" value={adForm.ctaButton?.link} onChange={e => setAdForm({...adForm, ctaButton: {...adForm.ctaButton!, link: e.target.value}})} className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono" /></div>
              </div>
              <div className="flex gap-4 pt-6"><button onClick={() => setAdTab('list')} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all">Cancel</button><button onClick={handleSaveAd} disabled={saving} className="flex-[2] py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2">{saving ? 'Saving...' : 'Publish Advertisement'}</button></div>
            </div>
            <div className="space-y-4">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Live Popup Preview</label>
              <div className="bg-slate-900/10 rounded-3xl p-8 border border-slate-100 flex items-center justify-center min-h-[400px]">
                <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full relative">
                  <div className="absolute top-4 right-4 text-slate-300 font-bold text-lg cursor-not-allowed">✕</div>
                  <div className="aspect-video bg-slate-100 rounded-2xl overflow-hidden mb-6 flex items-center justify-center">{adFile ? <img src={URL.createObjectURL(adFile)} className="w-full h-full object-cover" alt="Preview" /> : <span className="text-slate-300 text-4xl">🖼</span>}</div>
                  <div className="space-y-3"><div className="h-4 bg-slate-100 rounded-full w-3/4"></div><div className="h-3 bg-slate-50 rounded-full w-1/2"></div></div>
                  <button className="w-full mt-8 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg">{adForm.ctaButton?.text || 'CTA BUTTON'}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandSettings;
