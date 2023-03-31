import { getUser } from "framework";

type settingType = Record<"status" | "cookie" | "xml", boolean>;

export default class BookConnect {
  private xml = false;
  public account: string = "";

  public settings(): settingType {
    return {
      status: true,
      cookie: true,
      xml: this.xml,
    };
  }
}
