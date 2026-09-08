import { App, PluginSettingTab, Setting } from 'obsidian';
import Vision2CanvasPlugin from './main';
import { DEFAULT_VISION_SYSTEM_PROMPT } from './ai/promptTemplates';

export class Vision2CanvasSettingTab extends PluginSettingTab {
  plugin: Vision2CanvasPlugin;

  constructor(app: App, plugin: Vision2CanvasPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('AI Provider')
      .setHeading();

    new Setting(containerEl)
      .setName('Connection Type')
      .setDesc('Choose Local for LM Studio or another local OpenAI-compatible server, or Remote for a hosted API.')
      .addDropdown(dropdown => dropdown
        .addOption('remote', 'Remote API')
        .addOption('local', 'Local model (LM Studio)')
        .setValue(this.plugin.settings.aiProvider)
        .onChange(async (value) => {
          const provider = value as 'local' | 'remote';
          const remoteDefault = 'https://generativelanguage.googleapis.com/v1beta/openai';
          const localDefault = 'http://127.0.0.1:1234/v1';

          if (provider === 'local' && (!this.plugin.settings.apiEndpoint || this.plugin.settings.apiEndpoint === remoteDefault)) {
            this.plugin.settings.apiEndpoint = localDefault;
          } else if (provider === 'remote' && this.plugin.settings.apiEndpoint === localDefault) {
            this.plugin.settings.apiEndpoint = remoteDefault;
          }

          this.plugin.settings.aiProvider = provider;
          await this.plugin.saveSettings();
          this.display();
        }));

    // AI Gateway Endpoint
    new Setting(containerEl)
      .setName('AI API Endpoint')
      .setDesc(this.plugin.settings.aiProvider === 'local'
        ? 'Base URL of your local OpenAI-compatible server. LM Studio default: http://127.0.0.1:1234/v1'
        : 'URL of your OpenAI-compatible API Gateway, Google AI Studio, or MLLM server.')
      .addText(text => text
        .setPlaceholder(this.plugin.settings.aiProvider === 'local'
          ? 'http://127.0.0.1:1234/v1'
          : 'https://generativelanguage.googleapis.com/v1beta/openai')
        .setValue(this.plugin.settings.apiEndpoint)
        .onChange(async (value) => {
          this.plugin.settings.apiEndpoint = value.trim();
          await this.plugin.saveSettings();
        }));

    // API Key
    new Setting(containerEl)
      .setName('API Key')
      .setDesc(this.plugin.settings.aiProvider === 'local'
        ? 'Optional. Leave empty for LM Studio and most local servers.'
        : 'API Key for authenticating with your AI gateway or Google AI Studio.')
      .addText(text => text
        .setPlaceholder('API Key...')
        .setValue(this.plugin.settings.apiKey)
        .onChange(async (value) => {
          this.plugin.settings.apiKey = value.trim();
          await this.plugin.saveSettings();
        }));

    // Model Name
    new Setting(containerEl)
      .setName('Vision Model Name')
      .setDesc('Name of the Vision MLLM model to use (e.g. gemini-flash-latest, gpt-4o, claude-3-5-sonnet).')
      .addText(text => text
        .setPlaceholder('gemini-flash-latest')
        .setValue(this.plugin.settings.modelName)
        .onChange(async (value) => {
          this.plugin.settings.modelName = value.trim();
          await this.plugin.saveSettings();
        }));

    // Output Folder
    new Setting(containerEl)
      .setName('Canvas Output Folder')
      .setDesc('Folder in your vault where generated .canvas files will be saved (leave empty for Vault root).')
      .addText(text => text
        .setPlaceholder('Canvases/Handwritten')
        .setValue(this.plugin.settings.outputFolder)
        .onChange(async (value) => {
          this.plugin.settings.outputFolder = value.trim();
          await this.plugin.saveSettings();
        }));

    // Layout Customization
    new Setting(containerEl)
      .setName('Canvas Layout & Prompt')
      .setHeading();

    new Setting(containerEl)
      .setName('Auto-Open Canvas After Creation')
      .setDesc('Automatically open the newly generated .canvas file in obsidian.')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoOpenCanvas)
        .onChange(async (value) => {
          this.plugin.settings.autoOpenCanvas = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Custom System Prompt')
      .setDesc('Override default System Prompt for Vision AI model.')
      .addTextArea(text => text
        .setPlaceholder(DEFAULT_VISION_SYSTEM_PROMPT)
        .setValue(this.plugin.settings.customPrompt)
        .onChange(async (value) => {
          this.plugin.settings.customPrompt = value;
          await this.plugin.saveSettings();
        }));
  }
}
