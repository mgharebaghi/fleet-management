import { ActionLink } from "../action-link/action-link";
import styles from "./pagination.module.css";

const pageNumberFormatter = new Intl.NumberFormat("fa-IR");

type PaginationProps = {
  label: string;
  currentPage: number;
  totalPages: number;
  buildHref: (pageNumber: number) => string;
};

export function Pagination({
  label,
  currentPage,
  totalPages,
  buildHref,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className={styles.pagination} aria-label={label}>
      {currentPage > 1 ? (
        <ActionLink href={buildHref(currentPage - 1)} rel="prev">
          صفحه قبل
        </ActionLink>
      ) : (
        <span className={styles.disabledPageLink}>صفحه قبل</span>
      )}

      <span className={styles.pageIndicator} aria-current="page">
        صفحه {pageNumberFormatter.format(currentPage)} از{" "}
        {pageNumberFormatter.format(totalPages)}
      </span>

      {currentPage < totalPages ? (
        <ActionLink href={buildHref(currentPage + 1)} rel="next">
          صفحه بعد
        </ActionLink>
      ) : (
        <span className={styles.disabledPageLink}>صفحه بعد</span>
      )}
    </nav>
  );
}
