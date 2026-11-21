// Everything an <input> holds is a string, so form state is all strings;
// toCruiseInput converts it to what cruiseSchema and the actions expect.
export type CruiseFormValues = {
  ship: string;
  start_date: string;
  end_date: string;
  itinerary_notes: string;
};

export type CruiseFormInput = {
  ship: string;
  start_date: string;
  end_date: string;
  itinerary_notes: string | null;
};

export const emptyCruiseFormValues: CruiseFormValues = {
  ship: "",
  start_date: "",
  end_date: "",
  itinerary_notes: "",
};

export function toCruiseFormValues(cruise: {
  ship: string | null;
  start_date: string;
  end_date: string;
  itinerary_notes: string | null;
}): CruiseFormValues {
  return {
    ship: cruise.ship ?? "",
    start_date: cruise.start_date,
    end_date: cruise.end_date,
    itinerary_notes: cruise.itinerary_notes ?? "",
  };
}

export function toCruiseInput(values: CruiseFormValues): CruiseFormInput {
  return {
    ship: values.ship,
    start_date: values.start_date,
    end_date: values.end_date,
    // An empty textarea is "", but the schema wants null for "no notes".
    itinerary_notes:
      values.itinerary_notes.trim() === "" ? null : values.itinerary_notes,
  };
}