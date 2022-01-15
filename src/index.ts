// import { LocalStorage } from "node-localstorage";
import { LocalStorage } from "node-localstorage";
import TelegramBot from "node-telegram-bot-api";
import { ChatID, Variable } from "tgbot-helpers";

type KeyboardId = string;
// type CallbackId = string;
// type CallbackAttribute = string;
// type CallbackValue = string;
// type CallbackData = `${KeyboardId}:${string}`;

// interface ICallbackData<K extends string, V> {
//   keyboardId: KeyboardId;
//   callbackId: CallbackId;
//   attribute?: K;
//   data?: V;
// }

export abstract class TGKeyboard {
  public readonly keyboardMessageId: Variable<number>;

  constructor(
    public readonly keyboardId: KeyboardId,
    public readonly bot: TelegramBot,
    public readonly ls: LocalStorage,
    public readonly message?: string
  ) {
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
  public editKeyboard(chat_id: ChatID, new_keyboard?: TelegramBot.InlineKeyboardButton[][]): void {
    const message_id = this.keyboardMessageId.get(chat_id);
    if (message_id) {
      this.bot.editMessageReplyMarkup({ inline_keyboard: new_keyboard || this.keyboard(chat_id) }, { chat_id, message_id });
    }
  }

  /**
   * Create callback data for this keyboard.
   */
  protected ccd(data: string | number | (string | number)[], joinWith: string = ":"): string {
    return this.keyboardId + ":" + (Array.isArray(data) ? data.map(s => s.toString()).join(joinWith) : data.toString());
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
