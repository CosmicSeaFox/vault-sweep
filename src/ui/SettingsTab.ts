
import {
  App,
  PluginSettingTab,
  Setting,
  type SettingDefinitionItem,
} from "obsidian";
import type VaultSweepPlugin from "../core/VaultSweepPlugin";

export class SettingsTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: VaultSweepPlugin
  ) {
    super(app, plugin);
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        type: "group",
        heading: "Scan",
        items: [
          {
            name: "Duplicate Files",
            desc: "Find files with the same name in different folders",
            control: {
              type: "toggle",
              key: "enableDuplicates",
            },
          },
          {
            name: "Unused Attachments",
            desc: "Find images, documents and archives not referenced anywhere",
            control: {
              type: "toggle",
              key: "enableAttachments",
            },
          },
          {
            name: "Empty Notes",
            desc: "Find notes with no text, links, or tasks",
            control: {
              type: "toggle",
              key: "enableEmptyNotes",
            },
          },
          {
            name: "Untitled Notes",
            desc: "Find Untitled, New Note, and empty daily notes",
            control: {
              type: "toggle",
              key: "enableUntitled",
            },
          },
          {
            name: "Orphan Notes",
            desc: "Find notes with no outgoing links and no backlinks",
            control: {
              type: "toggle",
              key: "enableOrphans",
            },
          },
          {
            name: "Large Files",
            desc: "Find files at or above the threshold below",
            control: {
              type: "toggle",
              key: "enableLargeFiles",
            },
          },
        ],
      },

      {
        type: "group",
        heading: "File scanning",
        items: [
          {
            name: "Large file threshold",
            desc: "Files at or above this size are flagged",
            render: (setting) => {
              new Setting(setting.settingEl)
                .setName("Large file threshold")
                .setDesc("Files at or above this size are flagged")
                .addDropdown((dropdown) => {
                  dropdown
                    .addOption("50", "50 MB")
                    .addOption("100", "100 MB")
                    .addOption("500", "500 MB")
                    .setValue(
                      String(this.plugin.settings.largeFileThresholdMB)
                    )
                    .onChange(async (value) => {
                      this.plugin.settings.largeFileThresholdMB = Number(value);
                      await this.plugin.saveSettings();
                    });
                });
            },
          },
          {
            name: "Ignored folders",
            desc: "Folders to skip entirely, one per line",
            render: (setting) => {
              new Setting(setting.settingEl)
                .setName("Ignored folders")
                .setDesc("Folders to skip entirely, one per line")
                .addTextArea((textarea) => {
                  textarea
                    .setValue(
                      this.plugin.settings.excludedFolders.join("\n")
                    )
                    .onChange(async (value) => {
                      this.plugin.settings.excludedFolders = value
                        .split("\n")
                        .map((line) => line.trim())
                        .filter((line) => line.length > 0);

                      await this.plugin.saveSettings();
                    });
                });
            },
          },
        ],
      },

      {
        type: "group",
        heading: "Cache",
        items: [
          {
            name: "Clear cached scan results",
            desc: "Forget stored results. Does not touch any files.",
            action: () => {
              this.plugin.clearCache();
            },
          },
        ],
      },
    ];
  }
}
