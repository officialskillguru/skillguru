import { useState, useEffect } from "react";
import { type Mentor } from "../types";
import { mentorService } from "../services/mentor.service";

export function useMentor(slug: string | undefined) {
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchMentor() {
      if (!slug) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        const data = await mentorService.getMentorBySlug(slug);
        
        if (isMounted) {
          if (!data) {
            setError(new Error("Mentor not found"));
          } else {
            setMentor(data);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void fetchMentor();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  return { mentor, loading, error };
}
