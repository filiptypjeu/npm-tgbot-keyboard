// import { LocalStorage } from "node-localstorage";
import { LocalStorage } from "node-localstorage";
import TelegramBot from "node-telegram-bot-api";
import { ChatID, Variable } from "tgbot-helpers";

export type KeyboardId = string;
export type CallbackDataSignature = string | number | (string | number)[];
export type CallbackDataMapping<T> = (element: T, row: number, column: number) => TelegramBot.KeyboardButton;

/**
 * Create callback data.
 */
const ccd = (data: CallbackDataSignature, keyboardId?: KeyboardId, joinWith: string = ":"): string => {
  return (keyboardId ? keyboardId + joinWith : "") + (Array.isArray(data) ? data.map(s => s.toString()).join(joinWith) : data.toString());
};

export abstract class TGKeyboard {
  public readonly keyboardMessageId: Variable<number>;

  constructor(
    public readonly keyboardId: KeyboardId,
    public readonly bot: TelegramBot,
    public readonly ls: LocalStorage,
    public readonly message?: string,
    public readonly joinCallbackDataWith: string = ":"
  ) {
    if (this.keyboardId.includes(joinCallbackDataWith)) {
      throw new Error("Keyboard ID can not include the callback data joiner");
    }
    if (!this.keyboardId) {
      throw new Error("Keyboard ID can not be an empty string");
    }

    // Create variable for storing message IDs
    this.keyboardMessageId = new Variable<number>("keyboardMessageId" + keyboardId, 0, this.ls);

    // Register query callback
    this.bot.on("callback_query", q => {
      const data = (q.data || "").split(":");
      if (data[0] !== this.keyboardId) {
        return;
      }
      const response = this.handleCallback(data.slice(1).join(":"), q) || undefined;
      this.bot.answerCallbackQuery(q.id, { text: response });
    });
  }

  /**
   * Send a new keyboard.
   */
  public sendKeyboard(chat_id: ChatID, message?: string, parse_mode: TelegramBot.ParseMode = "HTML"): void {
    this.removeKeyboard(chat_id);
    this.bot
      .sendMessage(
        chat_id,
        // The message can not be empty
        message || this.message || "Keyboard",
        {
          parse_mode,
          reply_markup: {
            inline_keyboard: this.keyboard(chat_id),
          },
        }
      )
      .then(m => this.keyboardMessageId.set(m.message_id.toString(), chat_id))
      .catch(() => {
        return;
      });
  }

  /**
   * Remove the previous keyboard, by either removing the whole message or changing it to a message without a keyboard.
   */
  public removeKeyboard(chat_id: ChatID, text?: string, parse_mode: TelegramBot.ParseMode = "HTML"): void {
    const message_id = this.keyboardMessageId.get(chat_id);
    if (message_id) {
      if (text) {
        this.bot.editMessageText(text, { chat_id, message_id, parse_mode });
      } else {
        this.bot.deleteMessage(chat_id, message_id.toString());
      }
    }
    this.keyboardMessageId.reset(chat_id);
  }

  /**
   * Edit the previous keyboard.
   */
  public editKeyboard(
    chat_id: ChatID,
    new_keyboard?: TelegramBot.InlineKeyboardButton[][],
    text?: string,
    parse_mode: TelegramBot.ParseMode = "HTML"
  ): void {
    const message_id = this.keyboardMessageId.get(chat_id);
    if (!message_id) return;

    (text ? this.bot.editMessageText(text, { chat_id, message_id, parse_mode }) : Promise.resolve()).then(() =>
      this.bot.editMessageReplyMarkup({ inline_keyboard: new_keyboard || this.keyboard(chat_id) }, { chat_id, message_id })
    );
  }

  /**
   * Create callback data for this keyboard.
   */
  protected ccd(data: CallbackDataSignature): string {
    return ccd(data, this.keyboardId, this.joinCallbackDataWith);
  }

  /**
   * Create a keyboard.
   */
  public abstract keyboard(chat_id: ChatID): TelegramBot.InlineKeyboardButton[][];

  /**
   * Handle the callback from this keyboard.
   *
   * @returns the query answer that should be sent to the user.
   */
  protected abstract handleCallback(callbackData: string, q: TelegramBot.CallbackQuery): string;
}

export class TGKeyboardBuilder {
  private keyboard: TelegramBot.InlineKeyboardButton[][] = [];

  constructor(private readonly keyboardId?: KeyboardId, private readonly joinCallbackDataWith: string = ":") {}

  private get currentRow(): TelegramBot.KeyboardButton[] {
    const i = this.keyboard.length - 1;
    if (i < 0) {
      throw new Error("There are no rows added to the keyboard.");
    }
    return this.keyboard[i];
  }

  public ccd(data?: CallbackDataSignature): string | undefined {
    return data ? ccd(data, this.keyboardId, this.joinCallbackDataWith) : undefined;
  }

  public build(): TelegramBot.InlineKeyboardButton[][] {
    return this.keyboard;
  }

  public addButton(button: TelegramBot.InlineKeyboardButton): TGKeyboardBuilder;
  public addButton(text: string, callback_data?: CallbackDataSignature): TGKeyboardBuilder;
  public addButton(text: TelegramBot.InlineKeyboardButton | string, callback_data?: CallbackDataSignature): TGKeyboardBuilder {
    this.currentRow.push(typeof text === "string" ? { text, callback_data: this.ccd(callback_data) } : text);
    return this;
  }

  public addButtons<T>(list: (T | undefined)[], mapping: CallbackDataMapping<T>): TGKeyboardBuilder {
    let column = this.currentRow.length;
    const row = this.keyboard.length - 1;
    list.forEach(e => {
      if (e !== undefined) {
        this.addButton(mapping(e, row, column));
        column++;
      }
    });
    return this;
  }

  public addRow<T>(list: (T | undefined)[], mapping: CallbackDataMapping<T>): TGKeyboardBuilder;
  public addRow(): TGKeyboardBuilder;
  public addRow<T>(list?: (T | undefined)[], mapping?: CallbackDataMapping<T>): TGKeyboardBuilder {
    this.keyboard.push([]);
    if (list && mapping) {
      this.addButtons(list, mapping);
    }
    return this;
  }

  public addRows<T>(list: (T | undefined)[][], mapping: CallbackDataMapping<T>): TGKeyboardBuilder {
    list.forEach(l => this.addRow(l, mapping));
    return this;
  }
}
