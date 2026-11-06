import dayjs from 'dayjs';

export const MS_IN = {
  second: 1000,
  minute: 1000 * 60,
  hour: 1000 * 60 * 60,
  day: 1000 * 60 * 60 * 24,
  week: 1000 * 60 * 60 * 24 * 7,
};

export function get_latest_session<T extends { date: Date }>(
  sessions: T[],
): [T, T[]] {
  const rest: T[] = [];
  let latest = sessions[0];

  for (let i = 1; i < sessions.length; i++) {
    const this_one = sessions[i];
    if (this_one.date.getTime() < latest.date.getTime()) {
      rest.push(latest);
      latest = this_one;
    } else {
      rest.push(this_one);
    }
  }

  return [latest, rest];
}

export function get_next_session<
  T extends { date: Date; every: number; ends: Date | null; index: number },
>(session: T): T | null {
  if (session.every == 0) {
    return null;
  }

  const date = dayjs(session.date)
    .tz('America/New_York')
    .add(7 * session.every, 'days')
    .toDate();

  if (session.ends && date > session.ends) {
    return null;
  }

  const next_session: T = {
    ...session,
    index: session.index + 1,
    date,
  };

  return next_session;
}

export function get_n_occurrences<
  T extends { date: Date; every: number; ends: Date | null; index: number },
>(session: T, num: number): T[] {
  const output = [session];

  for (let i = 1; i < num; i++) {
    const next_session = get_next_session(output[output.length - 1]);
    if (next_session != null) {
      output.push(next_session);
    } else {
      break;
    }
  }

  return output;
}

export function repeat_dates_weekly<
  T extends { date: Date; every: number; ends: Date | null; index: number },
>(dates_input: T[], max_num: number): T[] {
  let dates = dates_input;
  const output: T[] = [];

  for (let i = 0; i < max_num; i++) {
    if (dates.length == 0) break;

    // Get latest session
    const [latest_session, rest] = get_latest_session(dates);
    dates = rest;

    output.push(latest_session);

    // Add new session to list if required
    const after_latest = get_next_session(latest_session);
    if (after_latest != null) {
      dates.push(after_latest);
    }
  }

  return output;
}

export function repeat_dates_until<
  T extends { date: Date; every: number; ends: Date | null; index: number },
>(dates_input: T[], max_num: number, until?: Date): T[] {
  let dates = dates_input;
  const output: T[] = [];

  for (let i = 0; i < max_num; i++) {
    if (dates.length == 0) break;

    // Get latest session
    const [latest_session, rest] = get_latest_session(dates);
    dates = rest;

    if (until && latest_session.date > until) break;

    output.push(latest_session);

    // Add new session to list if required
    const after_latest = get_next_session(latest_session);
    if (after_latest != null) {
      dates.push(after_latest);
    }
  }

  return output;
}
