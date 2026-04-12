import ahocorasick
import re
from typing import List, Dict, Any, Set, Tuple

class SpellcheckEngine:
    """
    纯规则拼写检查引擎，基于 Aho-Corasick 算法与正则表达式。
    """
    def __init__(self):
        self.automaton = ahocorasick.Automaton()
        self.mistakes: Dict[str, Tuple[str, str]] = {} # key: wrong, value: (suggestion, reason)
        self.whitelist: Set[str] = set()
        self._is_built = False
        
        # 内置高频易错词库
        self._load_builtin_rules()

    def _load_builtin_rules(self):
        # 常见别字与混淆词
        rules = [
            ("地确", "的确", "常见别字"),
            ("再所不惜", "在所不惜", "成语固定搭配"),
            ("已经", "已经", "拼写修正"),
            ("以经", "已经", "常见别字"),
            ("做为一个", "作为一个", "常见别字"),
            ("的地确确", "的确确实", "常见别字"),
            ("必需", "必须", "混淆（请确认上下文）"),
            ("其它", "其他", "现代用法建议用'其他'指代人和物"),
            ("再接再励", "再接再厉", "成语固定搭配"),
            ("穿流不息", "川流不息", "成语固定搭配"),
            ("莫明其妙", "莫名其妙", "成语固定搭配"),
            ("不假思索", "不假思索", "固定用法"),
            ("不加思索", "不假思索", "成语固定搭配"),
            ("谈笑风声", "谈笑风生", "成语固定搭配"),
            ("人名币", "人民币", "常见别字"),
            ("截止目前", "截至目前", "常见搭配"),
            ("由其是", "尤其是", "常见别字"),
            ("一副药", "一付药", "量词混淆"), # 或反之
            ("反映情况", "反应情况", "建议用'反映'"), # 根据语境
            ("反应", "反映", "混淆（请确认上下文）"),
        ]
        for wrong, suggest, reason in rules:
            self.add_mistake(wrong, suggest, reason)

    def add_mistake(self, wrong: str, suggestion: str, reason: str):
        if not wrong:
            return
        self.mistakes[wrong] = (suggestion, reason)
        self.automaton.add_word(wrong, (wrong, suggestion, reason))
        self._is_built = False

    def set_whitelist(self, words: List[str]):
        self.whitelist.update(words)
        self._is_built = False

    def build(self):
        if not self._is_built:
            self.automaton.make_automaton()
            self._is_built = True

    def _is_in_whitelist(self, text: str, start: int, end: int) -> bool:
        """
        更精准的白名单检查：看匹配的位置是否落在任何白名单词汇所在的区间内。
        """
        for white in self.whitelist:
            for m in re.finditer(re.escape(white), text):
                w_start, w_end = m.start(), m.end()
                if w_start <= start and end <= w_end:
                    return True
        return False

    def check(self, text: str) -> List[Dict[str, Any]]:
        if not text:
            return []
        self.build()
            
        results = []
        raw_matches = []
        for end_index, (wrong, suggestion, reason) in self.automaton.iter(text):
            start_index = end_index - len(wrong) + 1
            raw_matches.append((start_index, end_index + 1, wrong, suggestion, reason))
        
        # 贪婪匹配：最长优先
        raw_matches.sort(key=lambda x: (x[0], -(x[1]-x[0])))
        
        last_end = -1
        for start, end, wrong, suggestion, reason in raw_matches:
            if start < last_end:
                continue
            
            if self._is_in_whitelist(text, start, end):
                continue
                
            results.append({
                "word": wrong,
                "suggestion": suggestion,
                "reason": reason,
                "offset": start
            })
            last_end = end

        # 增加模板检查
        results.extend(self._check_templates(text, results))
        results.sort(key=lambda x: x["offset"])
        return results

    def _check_templates(self, text: str, existing_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        template_results = []
        occupied_offsets = {r["offset"] for r in existing_results}
        
        # 1. 动词/形容词 + 的 -> 可能是 '得'
        # 简单判定：...跑的(很|真|太|极|非常|十分)...
        de_pattern = re.compile(r"([\u4e00-\u9fa5]{1,2})(的)(很|真|太|极|非常|十分)")
        for m in de_pattern.finditer(text):
            offset = m.start(2)
            if offset not in occupied_offsets:
                template_results.append({
                    "word": "的",
                    "suggestion": "得",
                    "reason": "副词修饰形容词/补语建议用'得'",
                    "offset": offset
                })
                occupied_offsets.add(offset)
        
        return template_results

# 全局单例
spellcheck_engine = SpellcheckEngine()
