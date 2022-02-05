import { TGKeyboardBuilder } from "../index";

test("builder add row simple", () => {
  const b = new TGKeyboardBuilder();
  expect(b.build()).toEqual([]);

  b.addRow();
  expect(b.build()).toEqual([[]]);

  b.addRow().addRow().addRow();
  expect(b.build()).toEqual([[], [], [], []]);
});

test("builder add button with no row", () => {
  const b = new TGKeyboardBuilder();
  expect(() => b.addButton("")).toThrow();
});

test("builder add button using button", () => {
  const b = new TGKeyboardBuilder().addRow();

  b.addButton({ text: "a" }).addButton({ text: "b", callback_data: "data" });

  expect(b.build()).toEqual([[{ text: "a" }, { text: "b", callback_data: "data" }]]);
});

test("builder add button using text", () => {
  const b = new TGKeyboardBuilder().addRow();

  b.addButton("a").addButton("b", "data");

  expect(b.build()).toEqual([[{ text: "a" }, { text: "b", callback_data: "data" }]]);
});

test("builder add button using text and complex callback data", () => {
  const b = new TGKeyboardBuilder("ID", "j").addRow();

  b.addButton("a", [1, 2, 3, "STRING"]).addButton("b", 1234);

  expect(b.build()).toEqual([
    [
      { text: "a", callback_data: "IDj1j2j3jSTRING" },
      { text: "b", callback_data: "IDj1234" },
    ],
  ]);
});

test("builder add buttons", () => {
  const b = new TGKeyboardBuilder().addRow();

  b.addButtons(["a", "b"], (text: string) => ({ text, callback_data: text }));

  expect(b.build()).toEqual([
    [
      { text: "a", callback_data: "a" },
      { text: "b", callback_data: "b" },
    ],
  ]);
});

test("builder add row with buttons", () => {
  const b = new TGKeyboardBuilder();

  b.addRow(["a", "b"], (text: string) => ({ text, callback_data: text }));

  expect(b.build()).toEqual([
    [
      { text: "a", callback_data: "a" },
      { text: "b", callback_data: "b" },
    ],
  ]);
});

test("builder add rows with buttons", () => {
  const b = new TGKeyboardBuilder("MYID", "/");

  b.addRows([["a", undefined, "b"], [undefined, "c", undefined], ["d"]], (text: string, row: number, column: number) => ({
    text,
    callback_data: b.ccd([text, row, column]),
  }));

  expect(b.build()).toEqual([
    [
      { text: "a", callback_data: "MYID/a/0/0" },
      { text: "b", callback_data: "MYID/b/0/1" },
    ],
    [{ text: "c", callback_data: "MYID/c/1/0" }],
    [{ text: "d", callback_data: "MYID/d/2/0" }],
  ]);
});
