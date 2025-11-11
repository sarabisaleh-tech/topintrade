//+------------------------------------------------------------------+
//|                                              TradingMonitor.mq5 |
//|                                  Top In Trade - Live Journal EA |
//|                                             https://topintrade.ir |
//+------------------------------------------------------------------+
#property copyright "Top In Trade"
#property link      "https://topintrade.ir"
#property version   "1.00"
#property description "Expert Advisor (1'� '13'D /�*'� E9'ED'* D'�H (G /'4(H1/"

//--- Input Parameters
input string API_KEY = "";                          // �D�/ API 4E' ('�E�D)
input string SERVER_URL = "http://127.0.0.1:5000/receive";  // "/13 31H1 ~'�*HF
input int    UPDATE_INTERVAL = 5;                   // A'5DG (G1H213'F� (+'F�G)
input bool   SEND_HISTORY = true;                   // '13'D *'1�.�G E9'ED'*
input int    HISTORY_DAYS = 365;                    // *9/'/ 1H2G'� *'1�.�G

//--- Global Variables
datetime lastUpdateTime = 0;
bool isConnected = false;
string lastError = "";

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
    //--- (113� API Key
    if(StringLen(API_KEY) == 0)
    {
        Alert("D7A'K API Key .H/ 1' /1 *F8�E'* EA H'1/ �F�/!");
        return(INIT_PARAMETERS_INCORRECT);
    }

    //--- (113� E,H2 WebRequest
    if(!TerminalInfoInteger(TERMINAL_DLLS_ALLOWED))
    {
        Alert("D7A'K �2�FG 'Allow DLL imports' 1' A9'D �F�/!");
        return(INIT_FAILED);
    }

    Print("TradingMonitor EA 41H9 (G �'1 �1/");
    Print("API Key: ", API_KEY);
    Print("Server URL: ", SERVER_URL);

    //--- '13'D *'1�.�G /1 'HD�F ('1
    if(SEND_HISTORY)
    {
        SendHistoricalData();
    }

    //--- '13'D H69�* A9D� -3'(
    SendAccountData();

    return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    Print("TradingMonitor EA E*HBA 4/. /D�D: ", reason);
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
    //--- (113� 2E'F (G1H213'F�
    if(TimeCurrent() - lastUpdateTime >= UPDATE_INTERVAL)
    {
        SendAccountData();
        SendOpenPositions();
        lastUpdateTime = TimeCurrent();
    }
}

//+------------------------------------------------------------------+
//| Trade transaction event                                          |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest& request,
                        const MqlTradeResult& result)
{
    //--- '13'D AH1� /1 5H1* (3*G 4/F �' ('2 4/F ~H2�4F
    if(trans.type == TRADE_TRANSACTION_DEAL_ADD ||
       trans.type == TRADE_TRANSACTION_ORDER_ADD ||
       trans.type == TRADE_TRANSACTION_HISTORY_ADD)
    {
        Sleep(1000); // 5(1 �1/F (1'� '7E�F'F '2 +(* /1 *'1�.�G
        SendHistoricalData();
        SendOpenPositions();
        SendAccountData();
    }
}

//+------------------------------------------------------------------+
//| '13'D '7D'9'* -3'(                                               |
//+------------------------------------------------------------------+
void SendAccountData()
{
    string json = "{";
    json += "\"type\":\"account\",";
    json += "\"apiKey\":\"" + API_KEY + "\",";
    json += "\"timestamp\":\"" + TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS) + "\",";
    json += "\"data\":{";
    json += "\"balance\":" + DoubleToString(AccountInfoDouble(ACCOUNT_BALANCE), 2) + ",";
    json += "\"equity\":" + DoubleToString(AccountInfoDouble(ACCOUNT_EQUITY), 2) + ",";
    json += "\"margin\":" + DoubleToString(AccountInfoDouble(ACCOUNT_MARGIN), 2) + ",";
    json += "\"freeMargin\":" + DoubleToString(AccountInfoDouble(ACCOUNT_MARGIN_FREE), 2) + ",";
    json += "\"marginLevel\":" + DoubleToString(AccountInfoDouble(ACCOUNT_MARGIN_LEVEL), 2) + ",";
    json += "\"profit\":" + DoubleToString(AccountInfoDouble(ACCOUNT_PROFIT), 2) + ",";
    json += "\"credit\":" + DoubleToString(AccountInfoDouble(ACCOUNT_CREDIT), 2) + ",";
    json += "\"accountNumber\":\"" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + "\",";
    json += "\"accountName\":\"" + AccountInfoString(ACCOUNT_NAME) + "\",";
    json += "\"accountServer\":\"" + AccountInfoString(ACCOUNT_SERVER) + "\",";
    json += "\"accountCurrency\":\"" + AccountInfoString(ACCOUNT_CURRENCY) + "\",";
    json += "\"accountLeverage\":\"1:" + IntegerToString(AccountInfoInteger(ACCOUNT_LEVERAGE)) + "\"";
    json += "}}";

    SendToServer(json);
}

//+------------------------------------------------------------------+
//| '13'D ~H2�4FG'� ('2                                             |
//+------------------------------------------------------------------+
void SendOpenPositions()
{
    int totalPositions = PositionsTotal();

    string json = "{";
    json += "\"type\":\"positions\",";
    json += "\"apiKey\":\"" + API_KEY + "\",";
    json += "\"timestamp\":\"" + TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS) + "\",";
    json += "\"data\":[";

    for(int i = 0; i < totalPositions; i++)
    {
        ulong ticket = PositionGetTicket(i);
        if(ticket > 0)
        {
            if(i > 0) json += ",";

            json += "{";
            json += "\"ticket\":\"" + IntegerToString(ticket) + "\",";
            json += "\"symbol\":\"" + PositionGetString(POSITION_SYMBOL) + "\",";
            json += "\"type\":\"" + GetPositionTypeString(PositionGetInteger(POSITION_TYPE)) + "\",";
            json += "\"volume\":" + DoubleToString(PositionGetDouble(POSITION_VOLUME), 2) + ",";
            json += "\"openPrice\":" + DoubleToString(PositionGetDouble(POSITION_PRICE_OPEN), _Digits) + ",";
            json += "\"currentPrice\":" + DoubleToString(PositionGetDouble(POSITION_PRICE_CURRENT), _Digits) + ",";
            json += "\"sl\":" + DoubleToString(PositionGetDouble(POSITION_SL), _Digits) + ",";
            json += "\"tp\":" + DoubleToString(PositionGetDouble(POSITION_TP), _Digits) + ",";
            json += "\"profit\":" + DoubleToString(PositionGetDouble(POSITION_PROFIT), 2) + ",";
            json += "\"swap\":" + DoubleToString(PositionGetDouble(POSITION_SWAP), 2) + ",";
            json += "\"commission\":" + DoubleToString(PositionGetDouble(POSITION_COMMISSION), 2) + ",";
            json += "\"openTime\":\"" + TimeToString((datetime)PositionGetInteger(POSITION_TIME), TIME_DATE|TIME_SECONDS) + "\",";
            json += "\"comment\":\"" + PositionGetString(POSITION_COMMENT) + "\",";
            json += "\"magic\":" + IntegerToString(PositionGetInteger(POSITION_MAGIC));
            json += "}";
        }
    }

    json += "]}";

    SendToServer(json);
}

//+------------------------------------------------------------------+
//| '13'D *'1�.�G E9'ED'*                                            |
//+------------------------------------------------------------------+
void SendHistoricalData()
{
    datetime from = TimeCurrent() - (HISTORY_DAYS * 86400); // 86400 = *9/'/ +'F�G /1 1H2
    datetime to = TimeCurrent();

    HistorySelect(from, to);

    int totalDeals = HistoryDealsTotal();

    if(totalDeals == 0)
    {
        Print("Ğ E9'EDG'� /1 *'1�.�G �'A* F4/");
        return;
    }

    string json = "{";
    json += "\"type\":\"history\",";
    json += "\"apiKey\":\"" + API_KEY + "\",";
    json += "\"timestamp\":\"" + TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS) + "\",";
    json += "\"data\":[";

    int count = 0;
    for(int i = 0; i < totalDeals; i++)
    {
        ulong ticket = HistoryDealGetTicket(i);
        if(ticket > 0)
        {
            // AB7 E9'ED'* .1�/ H A1H4 (FG deposit/withdrawal)
            ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(ticket, DEAL_ENTRY);
            if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_IN)
            {
                if(count > 0) json += ",";

                json += "{";
                json += "\"ticket\":\"" + IntegerToString(ticket) + "\",";
                json += "\"orderTicket\":\"" + IntegerToString(HistoryDealGetInteger(ticket, DEAL_ORDER)) + "\",";
                json += "\"symbol\":\"" + HistoryDealGetString(ticket, DEAL_SYMBOL) + "\",";
                json += "\"type\":\"" + GetDealTypeString(HistoryDealGetInteger(ticket, DEAL_TYPE)) + "\",";
                json += "\"entry\":\"" + GetDealEntryString(entry) + "\",";
                json += "\"volume\":" + DoubleToString(HistoryDealGetDouble(ticket, DEAL_VOLUME), 2) + ",";
                json += "\"price\":" + DoubleToString(HistoryDealGetDouble(ticket, DEAL_PRICE), _Digits) + ",";
                json += "\"profit\":" + DoubleToString(HistoryDealGetDouble(ticket, DEAL_PROFIT), 2) + ",";
                json += "\"swap\":" + DoubleToString(HistoryDealGetDouble(ticket, DEAL_SWAP), 2) + ",";
                json += "\"commission\":" + DoubleToString(HistoryDealGetDouble(ticket, DEAL_COMMISSION), 2) + ",";
                json += "\"time\":\"" + TimeToString((datetime)HistoryDealGetInteger(ticket, DEAL_TIME), TIME_DATE|TIME_SECONDS) + "\",";
                json += "\"comment\":\"" + HistoryDealGetString(ticket, DEAL_COMMENT) + "\",";
                json += "\"magic\":" + IntegerToString(HistoryDealGetInteger(ticket, DEAL_MAGIC));
                json += "}";

                count++;
            }
        }
    }

    json += "]}";

    Print("'13'D ", count, " E9'EDG '2 *'1�.�G");
    SendToServer(json);
}

//+------------------------------------------------------------------+
//| '13'D JSON (G 31H1                                               |
//+------------------------------------------------------------------+
void SendToServer(string jsonData)
{
    char data[];
    char result[];
    string headers;

    StringToCharArray(jsonData, data, 0, StringLen(jsonData));

    string requestHeaders = "Content-Type: application/json\r\n";

    int timeout = 5000; // 5 +'F�G

    int res = WebRequest(
        "POST",
        SERVER_URL,
        requestHeaders,
        timeout,
        data,
        result,
        headers
    );

    if(res == 200)
    {
        isConnected = true;
        lastError = "";
        // Print("/�*' (' EHAB�* '13'D 4/");
    }
    else if(res == -1)
    {
        isConnected = false;
        int errorCode = GetLastError();
        lastError = ".7' /1 '13'D: " + IntegerToString(errorCode);

        if(errorCode == 4060)
        {
            Print(".7': URL /1 D�3* E,'2 F�3*. D7A'K URL 31H1 1' (G D�3* WebRequest '6'AG �F�/:");
            Print("Tools -> Options -> Expert Advisors -> Allow WebRequest for listed URL");
            Print("URL: ", SERVER_URL);
        }
        else
        {
            Print(lastError);
        }
    }
    else
    {
        isConnected = false;
        lastError = "31H1 ~'3. :�1EF*81G /'/: " + IntegerToString(res);
        Print(lastError);
    }
}

//+------------------------------------------------------------------+
//| *(/�D FH9 ~H2�4F (G 14*G                                         |
//+------------------------------------------------------------------+
string GetPositionTypeString(long type)
{
    switch(type)
    {
        case POSITION_TYPE_BUY:  return "BUY";
        case POSITION_TYPE_SELL: return "SELL";
        default: return "UNKNOWN";
    }
}

//+------------------------------------------------------------------+
//| *(/�D FH9 E9'EDG (G 14*G                                         |
//+------------------------------------------------------------------+
string GetDealTypeString(long type)
{
    switch(type)
    {
        case DEAL_TYPE_BUY:  return "BUY";
        case DEAL_TYPE_SELL: return "SELL";
        default: return "OTHER";
    }
}

//+------------------------------------------------------------------+
//| *(/�D FH9 H1H/ E9'EDG (G 14*G                                    |
//+------------------------------------------------------------------+
string GetDealEntryString(ENUM_DEAL_ENTRY entry)
{
    switch(entry)
    {
        case DEAL_ENTRY_IN:  return "IN";
        case DEAL_ENTRY_OUT: return "OUT";
        case DEAL_ENTRY_INOUT: return "INOUT";
        case DEAL_ENTRY_OUT_BY: return "OUT_BY";
        default: return "UNKNOWN";
    }
}

//+------------------------------------------------------------------+
//| FE'�4 '7D'9'* 1H� �'1*                                           |
//+------------------------------------------------------------------+
void OnChartEvent(const int id,
                  const long &lparam,
                  const double &dparam,
                  const string &sparam)
{
    // FE'�4 H69�* '*5'D 1H� �'1*
    string status = "TradingMonitor EA\n";
    status += "Status: " + (isConnected ? "Connected " : "Disconnected ") + "\n";
    status += "API Key: " + StringSubstr(API_KEY, 0, 20) + "...\n";
    if(StringLen(lastError) > 0)
        status += "Error: " + lastError;

    Comment(status);
}
