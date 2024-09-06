from collections import OrderedDict

import os, sys
sys.path.append(os.path.dirname(os.path.realpath(__file__)))
import re

from spotify_helper import SpotifyAPIHelper

def _extract_links(chat_text):    
    # Regular expression to capture timestamps with either '.' or '/' as date separators and URLs
    # pattern = r'(\[\d{2}[./]\d{2}[./]\d{2}, \d{2}:\d{2}:\d{2} (?:AM|PM)\]) (.+?): (https?://[^\s]+)'
    pattern = r'(\[\d{2}[./]\d{2}[./]\d{2}, \d{1,2}:\d{2}:\d{2} (?:AM|PM)\]) (.+?): (.*?)(https?://[^\s]+)'
    # pattern = r'(\[\d{2}[./]\d{2}[./]\d{2}, \d{1,2}:\d{2}:\d{2} (?:AM|PM)\]) (.+?): (.*?)(https?://[^\s]+)'

    # Find all matches with timestamps, names, and URLs
    matches = re.findall(pattern, chat_text, re.DOTALL)

    links_with_timestamps = {}    
    for match in matches:
        timestamp = match[0][1:len(match[0]) - 1]
        user = match[1][0:match[1].index(":")] if match[1].find(":") >= 0 else match[1]
        url = match[2]
        
        links_with_timestamps[url] = {"user": user, "timestamp": timestamp}

    all_urls = re.findall(r'(https?://[^\s]+)', chat_text)
    
    ret = OrderedDict()
    for url in all_urls:
        timestamp = ""
        user = ""
        if url in links_with_timestamps:
            timestamp = links_with_timestamps[url]["timestamp"]
            user = links_with_timestamps[url]["user"]
            
        ret[url] = {"user": user, "timestamp": timestamp}
        
    return ret

def _read_file(filename):
    with open(filename, "r") as file:
        return file.read()

def analyse_chat(filename, expand_spotify=True):
    chat_text = _read_file(filename)
    all_links = _extract_links(chat_text)
    
    if expand_spotify:
        o = SpotifyAPIHelper()
        spotify_info = o.analyse_spotify(all_links.keys())
        for id in spotify_info:
            all_links[id] = {**all_links[id], **spotify_info[id]}
        
    ret = []
    for url in all_links:
        new_link_obj = all_links[url]
        new_link_obj["url"] = url
        ret.append(new_link_obj)
        
    return ret
    
if __name__ == "__main__":
    # print(analyse_chat("uploads/sharevault.txt"))
    print(analyse_chat("uploads/sharevault.txt"))
