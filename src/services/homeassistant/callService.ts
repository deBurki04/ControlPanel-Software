import { invoke } from "@tauri-apps/api/core";
import { config } from "../../config/config";
import { localConfig } from "../../config/config.local";

export async function callHomeAssistantService(
  domain: string,
  service: string,
  serviceData: Record<string, unknown>,
) {
  await invoke("call_home_assistant_service", {
    url: config.homeAssistant.url,
    token: localConfig.homeAssistant.token,
    domain,
    service,
    serviceDataJson: JSON.stringify(serviceData),
  });
}
