import { useEffect, useState } from "react";
import { metaService } from "../services/meta.service";
import { useAuth } from "../context/AuthContext";
import { Department } from "../types";

/**
 * Department choices for a dropdown, shared by every Admin page that is
 * also reused under /branch/*. A Branch account manages only its own
 * department, so it must never even see other departments as an option —
 * the backend already force-scopes every query to their department
 * regardless of what's selected, but the picker itself has to match that
 * or it misleadingly implies cross-department access exists.
 */
export function useDepartmentOptions() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    metaService.departments().then((all) => {
      if (user?.role === "BRANCH") {
        setDepartments(all.filter((d) => d.id === user.branchAdmin?.departmentId));
      } else {
        setDepartments(all);
      }
    });
  }, [user]);

  return departments;
}
