// biome-ignore assist/source/organizeImports: TODO: 2025-08-19 - This is very annoying, please fix Biome
import Description from "./alert-description.svelte";
import Root from "./alert.svelte";
import Title from "./alert-title.svelte";

export { alertVariants, type AlertVariant } from "./alert.svelte";

export {
	Root,
	Description,
	Title,
	//
	Root as Alert,
	Description as AlertDescription,
	Title as AlertTitle,
};
