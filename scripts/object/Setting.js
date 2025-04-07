/**
 * Represents a configuration setting with a default value.
 */
class Setting {
	/**
	 * Creates a new Setting instance.
	 * @param {string} settingName - The unique name of the setting.
	 * @param {*} defaultValue - The default value for the setting if not already set.
	 */
	constructor(settingName, defaultValue) {
		this.name = settingName;
		this.defaultValue = defaultValue;
	}
}