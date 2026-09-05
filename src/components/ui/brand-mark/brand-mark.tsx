import Image from "next/image";

import styles from "./brand-mark.module.css";

const PRODUCT_NAME = "سامانه مدیریت ناوگان";

/**
 * The product's identity as it appears at the top of every page header. It
 * carries no page or feature context: the header's own eyebrow and title say
 * where the user is, so repeating that here would only duplicate it.
 */
export function BrandMark() {
  return (
    <div className={styles.brand}>
      <div className={styles.logoFrame}>
        <Image
          className={styles.logo}
          src="/brand/fleet-management-logo.png"
          alt={`نشان ${PRODUCT_NAME}`}
          width={64}
          height={48}
          priority
        />
      </div>
      <strong className={styles.name}>{PRODUCT_NAME}</strong>
    </div>
  );
}
