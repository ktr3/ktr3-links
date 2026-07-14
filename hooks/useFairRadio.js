"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createShuffleBag,
  drawNext,
  featureValue,
  reconcileShuffleBag,
  shuffleBagProgress,
} from "../lib/underground/shuffle-bag";

const DEFAULT_STORAGE_KEY = "gzk.radio.cycle.v1";

function defaultProfileKey(profile) {
  return profile.name;
}

export function useFairRadio(profiles, options = {}) {
  const {
    getKey = defaultProfileKey,
    storageKey = DEFAULT_STORAGE_KEY,
    featuredId = null,
  } = options;
  const ids = useMemo(() => profiles.map(getKey), [getKey, profiles]);
  const signature = ids.join("\u001f");
  const profileById = useMemo(
    () => new Map(profiles.map((profile) => [getKey(profile), profile])),
    [getKey, profiles],
  );
  const [bag, setBag] = useState(null);
  const [isFeatured, setIsFeatured] = useState(false);

  useEffect(() => {
    let savedState = null;

    try {
      savedState = JSON.parse(window.localStorage.getItem(storageKey));
    } catch {
      // A missing or malformed local value simply starts a new fair cycle.
    }

    let nextState = reconcileShuffleBag(
      savedState || createShuffleBag(ids),
      ids,
    );

    if (featuredId && profileById.has(featuredId)) {
      nextState = featureValue(nextState, ids, featuredId).state;
      setIsFeatured(true);
    } else if (!nextState.currentId || !profileById.has(nextState.currentId)) {
      nextState = drawNext(nextState, ids).state;
      setIsFeatured(false);
    }

    setBag(nextState);
  }, [featuredId, profileById, signature, storageKey]);

  useEffect(() => {
    if (!bag) return;

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(bag));
    } catch {
      // RANDOM still works when storage is blocked or unavailable.
    }
  }, [bag, storageKey]);

  const next = useCallback(() => {
    setIsFeatured(false);
    setBag((current) => drawNext(current || createShuffleBag(ids), ids).state);
  }, [signature]);

  const progress = shuffleBagProgress(bag, ids);

  return {
    currentProfile: bag?.currentId ? profileById.get(bag.currentId) || null : null,
    isFeatured,
    next,
    ...progress,
  };
}
