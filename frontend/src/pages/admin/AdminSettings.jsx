import { useEffect, useState } from "react";
import axios from "axios";
import { API, useSettings } from "@/App";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, X } from "lucide-react";
import ImagePicker from "@/components/ImagePicker";
import FocalPointControl from "@/components/FocalPointControl";
import RichTextEditor from "@/components/RichTextEditor";

const AdminSettings = () => {
  const { refreshSettings } = useSettings();
  const [siteSettings, setSiteSettings] = useState(null);
  const [homeSettings, setHomeSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [siteRes, homeRes] = await Promise.all([
        axios.get(`${API}/settings/site`),
        axios.get(`${API}/settings/home`),
      ]);
      setSiteSettings(siteRes.data);
      const home = homeRes.data || {};
      if (!home.hero) home.hero = {};
      if (!home.explore_tiles) home.explore_tiles = [];
      if (!home.category_grid_tiles) home.category_grid_tiles = [];
      setHomeSettings(home);
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateHero = (field, value) => {
    setHomeSettings((prev) => ({
      ...prev,
      hero: { ...(prev?.hero || {}), [field]: value },
    }));
  };

  const addExploreTile = () => {
    setHomeSettings((prev) => ({
      ...prev,
      explore_tiles: [
        ...(prev?.explore_tiles || []),
        {
          id: Date.now().toString(),
          title: "",
          subtitle: "",
          cta_text: "View Collection",
          cta_link: "",
          image_url: "",
          focal_point: "center center",
          is_visible: true,
        },
      ],
    }));
  };

  const addGridTile = () => {
    setHomeSettings((prev) => ({
      ...prev,
      category_grid_tiles: [
        ...(prev?.category_grid_tiles || []),
        {
          id: Date.now().toString(),
          title: "",
          slug: "",
          image_url: "",
          focal_point: "center center",
          link: "",
          bg_color: "#1B4D3E",
          is_visible: true,
        },
      ],
    }));
  };

  const updateGridTile = (index, field, value) => {
    setHomeSettings((prev) => ({
      ...prev,
      category_grid_tiles: (prev?.category_grid_tiles || []).map((t, i) =>
        i === index ? { ...t, [field]: value } : t
      ),
    }));
  };

  const removeGridTile = (index) => {
    setHomeSettings((prev) => ({
      ...prev,
      category_grid_tiles: (prev?.category_grid_tiles || []).filter((_, i) => i !== index),
    }));
  };

  const updateTile = (index, field, value) => {
    setHomeSettings((prev) => ({
      ...prev,
      explore_tiles: (prev?.explore_tiles || []).map((t, i) =>
        i === index ? { ...t, [field]: value } : t
      ),
    }));
  };

  const removeTile = (index) => {
    setHomeSettings((prev) => ({
      ...prev,
      explore_tiles: (prev?.explore_tiles || []).filter((_, i) => i !== index),
    }));
  };

  const saveSiteSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings/site`, siteSettings);
      refreshSettings?.();
      toast.success("Site settings saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const saveHomeSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings/home`, homeSettings);
      refreshSettings?.();
      toast.success("Homepage settings saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-[#DACBA0]/20 w-1/3" />
        <div className="h-64 bg-[#DACBA0]/20" />
      </div>
    );
  }

  return (
    <div data-testid="admin-settings">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-[#1B4D3E]">Settings</h1>
        <p className="text-[#1B4D3E]/60 mt-1">Manage homepage & site configuration</p>
      </div>

      <Tabs defaultValue="home" className="space-y-6">
        <TabsList className="bg-[#1B4D3E]/5">
          <TabsTrigger value="home">Homepage CMS</TabsTrigger>
          <TabsTrigger value="site">Site Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="home">
          <div className="space-y-8">
            <section className="bg-white border border-[#DACBA0]/30 p-6" data-testid="hero-cms-module">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-[#DACBA0] bg-[#1B4D3E] px-2 py-0.5">1</span>
                <h2 className="font-serif text-xl text-[#1B4D3E]">Hero Section</h2>
              </div>
              <p className="text-xs text-[#1B4D3E]/40 mb-6">
                Full-screen hero banner. Only explicitly set content will appear.
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-5">
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">
                      Eyebrow Text
                    </Label>
                    <Input
                      value={homeSettings?.hero?.hero_eyebrow || ""}
                      onChange={(e) => updateHero("hero_eyebrow", e.target.value)}
                      className="mt-1"
                      placeholder="e.g., Latest Drop"
                      data-testid="hero-eyebrow-input"
                    />
                  </div>

                  <div>
                    <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">
                      Hero Title *
                    </Label>
                    <Input
                      value={homeSettings?.hero?.hero_title || ""}
                      onChange={(e) => updateHero("hero_title", e.target.value)}
                      className="mt-1"
                      placeholder="e.g., Your Life"
                      data-testid="hero-title-input"
                    />
                  </div>

                  <div>
                    <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">
                      Hero Subtitle
                    </Label>
                    <Input
                      value={homeSettings?.hero?.hero_subtitle || ""}
                      onChange={(e) => updateHero("hero_subtitle", e.target.value)}
                      className="mt-1"
                      placeholder="e.g., Your Canvas"
                      data-testid="hero-subtitle-input"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">
                        CTA Text
                      </Label>
                      <Input
                        value={homeSettings?.hero?.hero_cta_text || ""}
                        onChange={(e) => updateHero("hero_cta_text", e.target.value)}
                        className="mt-1"
                        placeholder="Begin Your Journey"
                        data-testid="hero-cta-text-input"
                      />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">
                        CTA Link
                      </Label>
                      <Input
                        value={homeSettings?.hero?.hero_cta_link || ""}
                        onChange={(e) => updateHero("hero_cta_link", e.target.value)}
                        className="mt-1"
                        placeholder="/collections/sarees"
                        data-testid="hero-cta-link-input"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <ImagePicker
                      value={homeSettings?.hero?.hero_image_url || ""}
                      onChange={(url) => updateHero("hero_image_url", url)}
                      label="Hero Image"
                      testId="hero-image-picker"
                    />
                    <p className="text-xs text-[#DACBA0]/80 mt-2">
                      Recommended: 2560 x 1600 px. Image will be cropped with object-fit: cover using
                      the focal point set above.
                    </p>
                  </div>

                  <FocalPointControl
                    value={homeSettings?.hero?.hero_focal_point || "top center"}
                    onChange={(fp) => updateHero("hero_focal_point", fp)}
                    imageUrl={homeSettings?.hero?.hero_image_url || ""}
                    testId="hero-focal-control"
                  />

                  <div className="space-y-3 p-4 bg-[#1B4D3E]/5 border border-[#DACBA0]/20">
                    <h3 className="text-xs uppercase tracking-wider text-[#1B4D3E]/60 font-medium">
                      Text Legibility
                    </h3>

                    <div>
                      <Label className="text-xs text-[#1B4D3E]/60">Text Theme</Label>
                      <Select
                        value={homeSettings?.hero?.hero_text_theme || "dark"}
                        onValueChange={(v) => updateHero("hero_text_theme", v)}
                      >
                        <SelectTrigger className="mt-1" data-testid="hero-text-theme-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dark">Dark text (for light images)</SelectItem>
                          <SelectItem value="light">Light text (for dark images)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs text-[#1B4D3E]/60">
                        Overlay Opacity: {homeSettings?.hero?.hero_overlay_opacity ?? 40}%
                      </Label>
                      <Slider
                        value={[homeSettings?.hero?.hero_overlay_opacity ?? 40]}
                        onValueChange={([v]) => updateHero("hero_overlay_opacity", v)}
                        min={0}
                        max={90}
                        step={5}
                        className="mt-1"
                        data-testid="hero-overlay-slider"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <Switch
                        checked={homeSettings?.hero?.hero_overlay_gradient !== false}
                        onCheckedChange={(v) => updateHero("hero_overlay_gradient", v)}
                        data-testid="hero-gradient-toggle"
                      />
                      <Label className="text-sm">Gradient overlay (luxury fade)</Label>
                    </div>

                    <div className="flex items-center gap-3">
                      <Switch
                        checked={homeSettings?.hero?.hero_text_shadow !== false}
                        onCheckedChange={(v) => updateHero("hero_text_shadow", v)}
                        data-testid="hero-text-shadow-toggle"
                      />
                      <Label className="text-sm">Text shadow</Label>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white border border-[#DACBA0]/30 p-6" data-testid="explore-tiles-module">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#DACBA0] bg-[#1B4D3E] px-2 py-0.5">2</span>
                  <h2 className="font-serif text-xl text-[#1B4D3E]">
                    Category Tiles (Sarees / Scarves)
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={addExploreTile}
                  className="text-xs text-[#1B4D3E] flex items-center gap-1 border border-[#DACBA0]/30 px-3 py-2 hover:border-[#DACBA0] transition-colors"
                  data-testid="add-explore-tile-btn"
                >
                  <Plus className="w-3 h-3" /> Add Tile
                </button>
              </div>

              <p className="text-xs text-[#1B4D3E]/40 mb-6">
                Featured collection tiles shown below the hero (e.g., Sarees, Scarves). Each needs its
                own image.
              </p>

              {homeSettings?.explore_tiles?.length === 0 && (
                <p className="text-sm text-[#1B4D3E]/40 italic py-6 text-center border border-dashed border-[#DACBA0]/20">
                  No tiles configured. Click "Add Tile" to create Sarees / Scarves sections.
                </p>
              )}

              <div className="space-y-6">
                {homeSettings?.explore_tiles?.map((tile, index) => (
                  <div key={tile.id || index} className="border border-[#DACBA0]/20 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-medium text-[#1B4D3E]">
                        Tile {index + 1}: {tile.title || "(untitled)"}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={tile.is_visible !== false}
                            onCheckedChange={(v) => updateTile(index, "is_visible", v)}
                          />
                          <Label className="text-xs">{tile.is_visible !== false ? "Visible" : "Hidden"}</Label>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTile(index)}
                          className="p-1 text-[#C08081] hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs text-[#1B4D3E]/60">Title</Label>
                          <Input
                            value={tile.title || ""}
                            onChange={(e) => updateTile(index, "title", e.target.value)}
                            className="mt-1"
                            placeholder="Sarees"
                          />
                        </div>

                        <div>
                          <Label className="text-xs text-[#1B4D3E]/60">Subtitle</Label>
                          <Input
                            value={tile.subtitle || ""}
                            onChange={(e) => updateTile(index, "subtitle", e.target.value)}
                            className="mt-1"
                            placeholder="Heritage woven in every thread"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-[#1B4D3E]/60">CTA Text</Label>
                            <Input
                              value={tile.cta_text || ""}
                              onChange={(e) => updateTile(index, "cta_text", e.target.value)}
                              className="mt-1"
                              placeholder="View Collection"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-[#1B4D3E]/60">CTA Link</Label>
                            <Input
                              value={tile.cta_link || ""}
                              onChange={(e) => updateTile(index, "cta_link", e.target.value)}
                              className="mt-1"
                              placeholder="/collections/sarees"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <ImagePicker
                          value={tile.image_url || ""}
                          onChange={(url) => updateTile(index, "image_url", url)}
                          label="Tile Image"
                          testId={`tile-${index}-image-picker`}
                        />
                        <p className="text-xs text-[#DACBA0]/80">
                          Recommended: 2000 x 2500 px (4:5 portrait). Focal point adjustable below.
                        </p>
                        <FocalPointControl
                          value={tile.focal_point || "center center"}
                          onChange={(fp) => updateTile(index, "focal_point", fp)}
                          imageUrl={tile.image_url || ""}
                          testId={`tile-${index}-focal`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white border border-[#DACBA0]/30 p-6" data-testid="categories-grid-module">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#DACBA0] bg-[#1B4D3E] px-2 py-0.5">3</span>
                  <h2 className="font-serif text-xl text-[#1B4D3E]">Collection Grid</h2>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={homeSettings?.show_categories_grid !== false}
                    onCheckedChange={(v) => setHomeSettings({ ...homeSettings, show_categories_grid: v })}
                    data-testid="toggle-categories-grid"
                  />
                  <Label className="text-sm">
                    {homeSettings?.show_categories_grid !== false ? "Visible" : "Hidden"}
                  </Label>
                </div>
              </div>

              <p className="text-xs text-[#1B4D3E]/40 mb-6">
                8-tile design category grid on the homepage. Configure each tile's image and link below.
              </p>

              {homeSettings?.show_categories_grid !== false && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-[#1B4D3E]/60">Section Title</Label>
                      <Input
                        value={homeSettings?.categories_grid_title || ""}
                        onChange={(e) =>
                          setHomeSettings({ ...homeSettings, categories_grid_title: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-[#1B4D3E]/60">Section Subtitle</Label>
                      <Input
                        value={homeSettings?.categories_grid_subtitle || ""}
                        onChange={(e) =>
                          setHomeSettings({ ...homeSettings, categories_grid_subtitle: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="border-t border-[#DACBA0]/20 pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">
                        Grid Tiles
                      </Label>
                      <button
                        type="button"
                        onClick={addGridTile}
                        className="text-xs text-[#1B4D3E] flex items-center gap-1 border border-[#DACBA0]/30 px-3 py-1.5 hover:border-[#DACBA0]"
                        data-testid="add-grid-tile-btn"
                      >
                        <Plus className="w-3 h-3" /> Add Tile
                      </button>
                    </div>

                    {(!homeSettings?.category_grid_tiles ||
                      homeSettings.category_grid_tiles.length === 0) && (
                      <p className="text-sm text-[#1B4D3E]/40 italic py-4 text-center border border-dashed border-[#DACBA0]/20">
                        No tiles configured. They will auto-populate from your Design Categories, or click
                        "Add Tile" to customize.
                      </p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(homeSettings?.category_grid_tiles || []).map((tile, index) => (
                        <div key={tile.id || index} className="border border-[#DACBA0]/20 p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-[#1B4D3E]">
                              {tile.title || `Tile ${index + 1}`}
                            </span>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={tile.is_visible !== false}
                                onCheckedChange={(v) => updateGridTile(index, "is_visible", v)}
                              />
                              <button
                                type="button"
                                onClick={() => removeGridTile(index)}
                                className="p-1 text-[#C08081]"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs text-[#1B4D3E]/40">Title</Label>
                              <Input
                                value={tile.title || ""}
                                onChange={(e) => updateGridTile(index, "title", e.target.value)}
                                className="mt-0.5 h-8 text-sm"
                                placeholder="Atelier Variations"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-[#1B4D3E]/40">Link</Label>
                              <Input
                                value={tile.link || ""}
                                onChange={(e) => updateGridTile(index, "link", e.target.value)}
                                className="mt-0.5 h-8 text-sm"
                                placeholder="/collections/sarees?design_category=..."
                              />
                            </div>
                          </div>

                          <div>
                            <ImagePicker
                              value={tile.image_url || ""}
                              onChange={(url) => updateGridTile(index, "image_url", url)}
                              label="Tile Image"
                              testId={`grid-tile-${index}-image`}
                            />
                            <p className="text-xs text-[#DACBA0]/80 mt-1">
                              Recommended: 2000 x 2500 px (4:5 portrait). If empty, shows premium dark
                              background.
                            </p>
                          </div>

                          <FocalPointControl
                            value={tile.focal_point || "center center"}
                            onChange={(fp) => updateGridTile(index, "focal_point", fp)}
                            imageUrl={tile.image_url || ""}
                            testId={`grid-tile-${index}-focal`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="bg-white border border-[#DACBA0]/30 p-6" data-testid="optional-sections-module">
              <div className="flex items-center gap-2 mb-6">
                <span className="text-xs font-bold text-[#DACBA0] bg-[#1B4D3E] px-2 py-0.5">4</span>
                <h2 className="font-serif text-xl text-[#1B4D3E]">
                  Philosophy / Concierge / Newsletter
                </h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm text-[#1B4D3E]">Philosophy Quote</Label>
                    <p className="text-xs text-[#1B4D3E]/40">Brand philosophy section</p>
                  </div>
                  <Switch
                    checked={homeSettings?.show_philosophy !== false}
                    onCheckedChange={(v) => setHomeSettings({ ...homeSettings, show_philosophy: v })}
                    data-testid="toggle-philosophy"
                  />
                </div>

                {homeSettings?.show_philosophy !== false && (
                  <div className="ml-4 pl-4 border-l border-[#DACBA0]/20">
                    <Textarea
                      value={homeSettings?.philosophy_quote || ""}
                      onChange={(e) =>
                        setHomeSettings({ ...homeSettings, philosophy_quote: e.target.value })
                      }
                      className="min-h-[80px]"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-[#DACBA0]/10">
                  <div>
                    <Label className="text-sm text-[#1B4D3E]">Concierge CTA</Label>
                    <p className="text-xs text-[#1B4D3E]/40">WhatsApp/Email call-to-action</p>
                  </div>
                  <Switch
                    checked={homeSettings?.show_concierge !== false}
                    onCheckedChange={(v) => setHomeSettings({ ...homeSettings, show_concierge: v })}
                    data-testid="toggle-concierge"
                  />
                </div>

                {homeSettings?.show_concierge !== false && (
                  <div className="ml-4 pl-4 border-l border-[#DACBA0]/20 grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-[#1B4D3E]/60">Heading</Label>
                      <Input
                        value={homeSettings?.concierge_heading || ""}
                        onChange={(e) =>
                          setHomeSettings({ ...homeSettings, concierge_heading: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-[#1B4D3E]/60">Subheading</Label>
                      <Input
                        value={homeSettings?.concierge_subheading || ""}
                        onChange={(e) =>
                          setHomeSettings({ ...homeSettings, concierge_subheading: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-[#DACBA0]/10">
                  <div>
                    <Label className="text-sm text-[#1B4D3E]">Newsletter</Label>
                    <p className="text-xs text-[#1B4D3E]/40">Private access / newsletter signup</p>
                  </div>
                  <Switch
                    checked={homeSettings?.show_newsletter !== false}
                    onCheckedChange={(v) => setHomeSettings({ ...homeSettings, show_newsletter: v })}
                    data-testid="toggle-newsletter"
                  />
                </div>
              </div>
            </section>

            <button
              onClick={saveHomeSettings}
              disabled={saving}
              className="btn-luxury btn-luxury-primary disabled:opacity-50"
              data-testid="save-home-settings"
            >
              {saving ? "Saving..." : "Save Homepage Settings"}
            </button>
          </div>
        </TabsContent>

        <TabsContent value="site">
          <div className="space-y-6">
            <div className="bg-white border border-[#DACBA0]/30 p-6 space-y-6">
              <h2 className="font-serif text-xl text-[#1B4D3E]">Contact & Social</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">
                    WhatsApp Number
                  </Label>
                  <Input
                    value={siteSettings?.whatsapp_number || ""}
                    onChange={(e) =>
                      setSiteSettings({ ...siteSettings, whatsapp_number: e.target.value })
                    }
                    className="mt-2"
                    placeholder="+91 9330117552"
                  />
                </div>

                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">
                    Contact Email
                  </Label>
                  <Input
                    value={siteSettings?.contact_email || ""}
                    onChange={(e) =>
                      setSiteSettings({ ...siteSettings, contact_email: e.target.value })
                    }
                    className="mt-2"
                    placeholder="enquiries@chytare.com"
                  />
                </div>

                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">
                    Instagram Handle
                  </Label>
                  <Input
                    value={siteSettings?.instagram_handle || ""}
                    onChange={(e) =>
                      setSiteSettings({ ...siteSettings, instagram_handle: e.target.value })
                    }
                    className="mt-2"
                    placeholder="@chytarelifestyle"
                  />
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <Switch
                    checked={siteSettings?.instagram_visible || false}
                    onCheckedChange={(v) =>
                      setSiteSettings({ ...siteSettings, instagram_visible: v })
                    }
                  />
                  <Label>Show Instagram link</Label>
                </div>
              </div>

              <button
                onClick={saveSiteSettings}
                disabled={saving}
                className="btn-luxury btn-luxury-primary disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>

            <div className="bg-white border border-[#DACBA0]/30 p-6 space-y-4">
              <h2 className="font-serif text-xl text-[#1B4D3E]">Policies</h2>

              {[
                "shipping_policy",
                "returns_policy",
                "privacy_policy",
                "terms_conditions",
                "care_guide",
                "faqs",
                "authenticity_craftsmanship",
                "limited_edition_policy",
                "made_to_order_policy",
              ].map((key) => (
                <div key={key}>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60 capitalize">
                    {key.replace(/_/g, " ")}
                  </Label>
                  <RichTextEditor
                    value={siteSettings?.[key] || ""}
                    onChange={(html) => setSiteSettings({ ...siteSettings, [key]: html })}
                    className="mt-1"
                  />
                </div>
              ))}

              <button
                onClick={saveSiteSettings}
                disabled={saving}
                className="btn-luxury btn-luxury-primary disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Policies"}
              </button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;
