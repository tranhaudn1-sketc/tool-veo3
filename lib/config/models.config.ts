export interface ModelPricing {
  perImage?: number;
  perSecond?: number;
  perJob?: number;
}

export interface ImageModelConfig {
  id: string;
  name: string;
  description: string;
  pricing: ModelPricing;
  supportedAspectRatios: string[];
  maxSamples: number;
}

export interface VideoModelConfig {
  id: string;
  name: string;
  description: string;
  pricing: ModelPricing;
  supportedAspectRatios: string[];
  supportedDurations: number[]; // in seconds
  supportedResolutions: string[];
  supportsAudio: boolean;
  supportsImageToVideo: boolean;
}

export interface StylePreset {
  id: string;
  name: string;
  promptSuffix: string;
  iconName: string;
  previewColor: string;
}

export interface SamplePrompt {
  id: string;
  title: string;
  prompt: string;
  negativePrompt?: string;
  type: "image" | "video";
  aspectRatio: string;
  style?: string;
}

export const MODELS_CONFIG = {
  defaultImageModel: "flux-1.0-schnell",
  defaultVideoModel: "veo-2.0-generate-001",
  promptEnhanceModel: "gemini-3.5-flash-lite",

  imageModels: [
    {
      id: "flux-1.0-schnell",
      name: "FLUX.1 Schnell (Miễn phí 100% - Khuyên dùng)",
      description: "Mô hình sinh ảnh chân thực, chi tiết 4K, hoàn toàn miễn phí, không tốn quota",
      pricing: { perImage: 0.0 },
      supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
      maxSamples: 4,
    },
    {
      id: "turbo-sdxl",
      name: "Turbo SDXL (Tốc độ cao 2s - Miễn phí)",
      description: "Tạo ảnh siêu tốc trong 2 giây, không tốn phí",
      pricing: { perImage: 0.0 },
      supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
      maxSamples: 4,
    },
    {
      id: "imagen-3.0-generate-002",
      name: "Google Imagen 3 (Yêu cầu Vertex AI / Billing)",
      description: "Model cao cấp của Google DeepMind (yêu cầu Google Cloud Billing)",
      pricing: { perImage: 0.03 },
      supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
      maxSamples: 4,
    },
    {
      id: "imagen-3.0-fast-generate-001",
      name: "Google Imagen 3 Fast (Yêu cầu Vertex AI / Billing)",
      description: "Phiên bản tốc độ cao của Imagen 3 (yêu cầu Google Cloud Billing)",
      pricing: { perImage: 0.02 },
      supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
      maxSamples: 4,
    },
  ] as ImageModelConfig[],

  videoModels: [
    {
      id: "veo-2.0-generate-001",
      name: "Google Veo 2.0 (Yêu cầu Google Cloud Billing)",
      description: "Model video đỉnh cao của Google (yêu cầu liên kết thẻ thanh toán Google Cloud)",
      pricing: { perSecond: 0.06 },
      supportedAspectRatios: ["16:9", "9:16"],
      supportedDurations: [5, 8],
      supportedResolutions: ["720p", "1080p"],
      supportsAudio: true,
      supportsImageToVideo: true,
    },
    {
      id: "motion-video-free",
      name: "Video Motion Điện ảnh (Miễn phí 100% - 0đ)",
      description: "Tạo video chuyển động điện ảnh mượt mà, hoàn toàn miễn phí không cần thẻ",
      pricing: { perSecond: 0.0 },
      supportedAspectRatios: ["16:9", "9:16"],
      supportedDurations: [5],
      supportedResolutions: ["720p"],
      supportsAudio: false,
      supportsImageToVideo: true,
    },
    {
      id: "veo-3.1-generate-preview",
      name: "Google Veo 3.1 Preview (Vertex AI)",
      description: "Phiên bản thử nghiệm mới nhất của Veo",
      pricing: { perSecond: 0.08 },
      supportedAspectRatios: ["16:9", "9:16"],
      supportedDurations: [5, 8],
      supportedResolutions: ["720p", "1080p"],
      supportsAudio: true,
      supportsImageToVideo: true,
    },
  ] as VideoModelConfig[],

  stylePresets: [
    {
      id: "cinematic",
      name: "Điện ảnh (Cinematic)",
      promptSuffix: ", cinematic lighting, 35mm film photograph, dramatic shadows, 8k resolution, highly detailed",
      iconName: "Clapperboard",
      previewColor: "from-amber-600 to-red-600",
    },
    {
      id: "anime",
      name: "Anime / Makoto Shinkai",
      promptSuffix: ", vibrant anime aesthetic, Makoto Shinkai style, beautiful sky, sparkling lighting, studio ghibli atmosphere",
      iconName: "Palette",
      previewColor: "from-pink-500 to-indigo-500",
    },
    {
      id: "photorealistic",
      name: "Ảnh chụp chân thực",
      promptSuffix: ", ultra photorealistic, professional DSLR, 85mm f/1.4 lens, natural ambient lighting, ray tracing, sharp focus",
      iconName: "Camera",
      previewColor: "from-blue-600 to-cyan-500",
    },
    {
      id: "cyberpunk",
      name: "Cyberpunk",
      promptSuffix: ", cyberpunk style, neon lights, rainy reflection on asphalt, futuristic tech, purple and teal glow",
      iconName: "Zap",
      previewColor: "from-fuchsia-600 to-cyan-500",
    },
    {
      id: "3d-render",
      name: "3D Render / Octane",
      promptSuffix: ", octane render, unreal engine 5, 3D volumetric light, Pixar style high poly, clean background",
      iconName: "Box",
      previewColor: "from-orange-500 to-amber-400",
    },
    {
      id: "watercolor",
      name: "Màu nước nghệ thuật",
      promptSuffix: ", artistic watercolor painting, soft color bleeding, textured paper, subtle brush strokes, expressive",
      iconName: "Brush",
      previewColor: "from-emerald-500 to-teal-400",
    },
    {
      id: "studio-portrait",
      name: "Chân dung Studio",
      promptSuffix: ", professional studio portrait lighting, softbox illumination, neutral clean background, 8k resolution",
      iconName: "User",
      previewColor: "from-violet-600 to-purple-800",
    },
    {
      id: "retro-vintage",
      name: "Cổ điển 80s",
      promptSuffix: ", 1980s vintage film photograph, Polaroid aesthetic, warm grain, nostalgia, light leaks",
      iconName: "Sparkles",
      previewColor: "from-rose-500 to-yellow-500",
    },
  ] as StylePreset[],

  samplePrompts: [
    {
      id: "sp-v-1",
      title: "Drone bay qua ruộng bậc thang Mù Cang Chải",
      prompt: "Cinematic FPV drone shot flying over majestic green terraced rice fields in Mu Cang Chai at sunrise, misty morning light piercing through clouds, 4k ultra smooth motion",
      negativePrompt: "low quality, stutter, jerky motion, blurry",
      type: "video",
      aspectRatio: "16:9",
      style: "cinematic",
    },
    {
      id: "sp-v-2",
      title: "Mèo phi hành gia ngắm nhìn Trái Đất",
      prompt: "A cute ginger cat wearing a detailed NASA spacesuit floating inside an ISS observation cupola, looking down at Earth with cosmic nebula reflection in its helmet visor",
      negativePrompt: "blurry, low resolution, deformed limbs",
      type: "video",
      aspectRatio: "16:9",
      style: "3d-render",
    },
    {
      id: "sp-v-3",
      title: "Phố cổ Hội An ngày mưa đêm",
      prompt: "Slow motion tracking shot walking through a quiet Hoi An ancient lantern street at night during light rain, wet cobblestone reflections, glowing silk lanterns",
      negativePrompt: "shaky camera, overexposed, distorted",
      type: "video",
      aspectRatio: "9:16",
      style: "cinematic",
    },
    {
      id: "sp-i-1",
      title: "Nữ chiến binh tương lai Neon",
      prompt: "A heroic female cyber warrior in high-tech glowing exosuit standing on a neon rooftop of futuristic Neo-Tokyo, rain drops, intense gaze, ray-traced reflections",
      negativePrompt: "extra fingers, mutated hands, bad anatomy, blurry",
      type: "image",
      aspectRatio: "16:9",
      style: "cyberpunk",
    },
    {
      id: "sp-i-2",
      title: "Căn phòng trà đạo Nhật Bản tĩnh lặng",
      prompt: "Traditional Japanese tea room with tatami mats, open shoji screen revealing a serene bamboo garden with koi pond, warm afternoon sunlight filtering through leaves",
      negativePrompt: "distorted perspective, noise, cluttered",
      type: "image",
      aspectRatio: "16:9",
      style: "photorealistic",
    },
    {
      id: "sp-i-3",
      title: "Sinh vật huyền bí trong rừng đom đóm",
      prompt: "A mystical tiny dragon with crystalline wings resting on a glowing giant bioluminescent mushroom in an enchanted fantasy forest, macro lens, bokeh background",
      negativePrompt: "ugly, blurry, low quality",
      type: "image",
      aspectRatio: "1:1",
      style: "3d-render",
    },
  ] as SamplePrompt[],

  // Default Daily Spend Limit in USD
  defaultDailyLimitUSD: 10.0,
};
