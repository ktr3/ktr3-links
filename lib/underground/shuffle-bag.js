export const SHUFFLE_BAG_VERSION = 1;

function uniqueIds(ids) {
  return [...new Set(ids.filter((id) => typeof id === "string" && id.length > 0))];
}

function shuffle(ids, random) {
  const result = [...ids];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomValue = Math.min(Math.max(random(), 0), 0.9999999999999999);
    const swapIndex = Math.floor(randomValue * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

function shuffledCycle(ids, previousId, random) {
  const result = shuffle(uniqueIds(ids), random);

  if (result.length > 1 && result[0] === previousId) {
    const replacementIndex = result.findIndex((id) => id !== previousId);
    [result[0], result[replacementIndex]] = [result[replacementIndex], result[0]];
  }

  return result;
}

export function createShuffleBag(ids, options = {}) {
  const { previousId = null, random = Math.random, cycle = 1 } = options;

  return {
    version: SHUFFLE_BAG_VERSION,
    cycle,
    currentId: previousId,
    seen: [],
    remaining: shuffledCycle(ids, previousId, random),
  };
}

export function reconcileShuffleBag(state, ids, random = Math.random) {
  const availableIds = uniqueIds(ids);
  const available = new Set(availableIds);

  if (!state || state.version !== SHUFFLE_BAG_VERSION) {
    return createShuffleBag(availableIds, { random });
  }

  const remaining = uniqueIds(Array.isArray(state.remaining) ? state.remaining : [])
    .filter((id) => available.has(id));
  const remainingSet = new Set(remaining);
  const seen = uniqueIds(Array.isArray(state.seen) ? state.seen : [])
    .filter((id) => available.has(id) && !remainingSet.has(id));
  const known = new Set([...remaining, ...seen]);
  const additions = shuffle(
    availableIds.filter((id) => !known.has(id)),
    random,
  );

  return {
    version: SHUFFLE_BAG_VERSION,
    cycle: Number.isInteger(state.cycle) && state.cycle > 0 ? state.cycle : 1,
    currentId: available.has(state.currentId) ? state.currentId : null,
    seen,
    remaining: [...remaining, ...additions],
  };
}

export function drawNext(state, ids, random = Math.random) {
  const availableIds = uniqueIds(ids);

  if (availableIds.length === 0) {
    return {
      state: createShuffleBag([], { random }),
      value: null,
      position: 0,
      total: 0,
      cycle: 1,
    };
  }

  let nextState = reconcileShuffleBag(state, availableIds, random);

  if (nextState.remaining.length === 0) {
    nextState = createShuffleBag(availableIds, {
      previousId: nextState.currentId,
      random,
      cycle: nextState.cycle + 1,
    });
  }

  const [value, ...remaining] = nextState.remaining;
  const seen = [...nextState.seen.filter((id) => id !== value), value];
  const drawnState = {
    ...nextState,
    currentId: value,
    seen,
    remaining,
  };

  return {
    state: drawnState,
    value,
    position: seen.length,
    total: availableIds.length,
    cycle: drawnState.cycle,
  };
}

export function featureValue(state, ids, featuredId, random = Math.random) {
  const availableIds = uniqueIds(ids);
  const nextState = reconcileShuffleBag(state, availableIds, random);

  if (!featuredId || !availableIds.includes(featuredId)) {
    return {
      state: nextState,
      value: nextState.currentId,
      position: nextState.currentId ? nextState.seen.length : 0,
      total: availableIds.length,
      cycle: nextState.cycle,
      featured: false,
    };
  }

  const alreadySeen = nextState.seen.includes(featuredId);
  const seen = alreadySeen ? nextState.seen : [...nextState.seen, featuredId];
  const featuredState = {
    ...nextState,
    currentId: featuredId,
    seen,
    remaining: nextState.remaining.filter((id) => id !== featuredId),
  };

  return {
    state: featuredState,
    value: featuredId,
    position: seen.length,
    total: availableIds.length,
    cycle: featuredState.cycle,
    featured: true,
  };
}

export function shuffleBagProgress(state, ids) {
  const reconciled = reconcileShuffleBag(state, ids, () => 0);

  return {
    position: reconciled.currentId ? reconciled.seen.length : 0,
    total: uniqueIds(ids).length,
    cycle: reconciled.cycle,
  };
}
