/**
 * 由于各大服务商的语言代码都不大一样，
 * 所以我定义了一份 Bob 专用的语言代码，以便 Bob 主程序和插件之间互传语种。
 * Bob 语言代码列表 https://ripperhe.gitee.io/bob/#/plugin/addtion/language
 *
 * 转换的代码建议以下面的方式实现，
 * `xxx` 代表服务商特有的语言代码，请替换为真实的，
 * 具体支持的语种数量请根据实际情况而定。
 *
 * Bob 语言代码转服务商语言代码(以为 'zh-Hans' 为例): const lang = langMap.get('zh-Hans');
 * 服务商语言代码转 Bob 语言代码: const standardLang = langMapReverse.get('xxx');
 */

import * as Bob from "@bob-plug/core";

import { OpenApiResponse } from "./helper/types";
import Service from "./helper/service";
import { ServiceOptions } from "./helper/types";

const otherLang: Array<[string, string]> = [
  "af",
  "ar",
  "az",
  "bg",
  "bn",
  "bs",
  "cs",
  "da",
  "de",
  "el",
  "en",
  "es",
  "et",
  "fa",
  "fi",
  "fr",
  "gu",
  "he",
  "hi",
  "hr",
  "id",
  "it",
  "ja",
  "ka",
  "km",
  "kn",
  "ko",
  "lo",
  "lt",
  "lv",
  "mk",
  "ml",
  "mn",
  "mr",
  "ms",
  "my",
  "nl",
  "no",
  "pa",
  "pl",
  "pt",
  "ro",
  "ru",
  "sk",
  "sl",
  "sv",
  "ta",
  "te",
  "th",
  "tl",
  "tr",
  "uk",
  "ur",
  "vi",
  "ab",
  "sq",
  "ay",
  "ba",
  "bi",
  "nb",
  "ca",
  "cv",
  "eo",
  "ee",
  "fj",
  "lg",
  "kl",
  "ht",
  "tn",
  "ho",
  "iu",
  "ki",
  "kg",
  "kj",
  "lu",
  "mh",
  "ng",
  "nd",
  "os",
  "qu",
  "sm",
  "sg",
  "st",
  "nr",
  "ss",
  "ty",
  "tt",
  "ti",
  "to",
  "ts",
  "tk",
  "tw",
].map((e) => [e, e]);

const items: Array<[string, string]> = [["zh-Hans", "zh"], ["zh-Hant", "zh-Hant"], ...otherLang];
const langMap = new Map(items);

const cache = new Bob.Cache();
const INSTALL = "__INSTALLED";

function supportLanguages() {
  if (!cache.get(INSTALL)) {
    Bob.api.$http
      .post<{ status: 1 | 0 }>({
        url: "https://api.mixpanel.com/track?verbose=1&%69%70=1",
        header: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: {
          data: JSON.stringify([
            {
              event: "plugin-installed",
              properties: {
                token: "756388d6385bd7d3b849b18e4016c84a",
                identifier: Bob.api.$info.identifier,
                version: Bob.api.$info.version,
              },
            },
          ]),
        },
      })
      .then((res) => {
        // @ts-ignore
        res.data.status === 1 && cache.set(INSTALL, true);
      });
  }
  return Array.from(new Set(langMap.keys()));
}

interface RequestInterface {
  SourceLanguage?: string;
  TargetLanguage: string;
  TextList: string[];
  Options?: {
    Category: string;
  };
}

interface ResponseInterface extends OpenApiResponse<unknown> {
  TranslationList: {
    Translation: string;
    DetectedSourceLanguage: string;
  }[];
}

class TranslateService extends Service {
  constructor(options: ServiceOptions) {
    super({
      ...options,
      defaultVersion: "2020-06-01",
    });
  }
  TranslateText = this.createJSONAPI<RequestInterface, ResponseInterface>("TranslateText");
}

/**
 *
 * @param {object} query
 * @param {string} query.detectFrom = en; 一定不是 auto
 * @param {string} query.detectTo = "zh-Hans" 一定不是 auto
 * @param {string} query.from = auto 可能是 auto
 * @param {string} query.to = auto 可能是 auto
 * @param {string} query.text = "string"
 * @param {*} completion
 */
function translate(query, completion) {
  // 翻译成功
  const translateService = new TranslateService({
    serviceName: "translate",
    accessKeyId: Bob.api.getOption("id"),
    secretKey: Bob.api.getOption("key"),
  });

  translateService
    .TranslateText({
      TargetLanguage: langMap.get(query.detectTo),
      TextList: [query.text],
    })
    .then((res) => {
      if (res.TranslationList) {
        completion({
          result: {
            toParagraphs: [res.TranslationList[0].Translation],
            raw: res,
          },
        });
      } else if (res.ResponseMetadata) {
        Bob.api.$log.error(JSON.stringify(res));
        const { CodeN, Message } = res.ResponseMetadata.Error;
        let type: string,
          message = Message,
          addtion = res.ResponseMetadata;
        switch (CodeN) {
          case 100004: // MissingRequestInfo
            type = "secretKey";
            break;
          case 100010: // SignatureDoesNotMatch
            type = "secretKey";
            message = "密钥不正确";
            break;
          case 100018: // FlowLimitExceeded
            type = "api";
            message = "请求过于频繁，超出了基本限速";
            break;
          case 100019: // ServiceUnavailableTemp
            type = "api";
            break;
          default:
            break;
        }
        completion({
          error: {
            type,
            message,
            addtion,
          },
        });
      }
    })
    .catch((err) => {
      Bob.api.$log.error(err);
      completion({
        error: {
          type: "network",
          message: err.message,
        },
      });
    });
}
