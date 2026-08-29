/**
 * Single source of truth for the running application version (Admin, logs).
 * Reads from package.json — bump there for releases.
 */
import packageJson from "../package.json";

export function getAppVersion(): string {
  return packageJson.version;
}
