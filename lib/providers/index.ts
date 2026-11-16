import { GoogleGenAIProvider } from "./google-genai";
import { PollinationsProvider } from "./pollinations";
import { AIProvider } from "./types";

export * from "./types";
export * from "./google-genai";
export * from "./pollinations";

const googleGenAIProvider = new GoogleGenAIProvider();
const pollinationsProvider = new PollinationsProvider();

const providers: Record<string, AIProvider> = {
  "google-genai": googleGenAIProvider,
  pollinations: pollinationsProvider,
};

/**
 * Get active provider instance based on target model or provider ID
 */
export function getAIProvider(modelOrProviderId = "flux-1.0-schnell"): AIProvider {
  if (
    modelOrProviderId === "pollinations" ||
    modelOrProviderId.startsWith("flux") ||
    modelOrProviderId.startsWith("turbo") ||
    modelOrProviderId === "motion-video-free"
  ) {
    return pollinationsProvider;
  }

  const provider = providers[modelOrProviderId] || googleGenAIProvider;
  return provider;
}

/**
 * Register a new provider for future expansion
 */
export function registerAIProvider(provider: AIProvider): void {
  providers[provider.id] = provider;
}
