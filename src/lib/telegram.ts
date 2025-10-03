
"use server";

export const sendTelegramMessage = async (chatId: string, message: string) => {
    const botToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
    if (!botToken || botToken === "YOUR_TELEGRAM_BOT_TOKEN_HERE" || !chatId) {
        console.warn("Telegram bot token or chat ID is not configured. Skipping message.");
        return;
    };
    
    try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                chat_id: chatId, 
                text: message, 
                parse_mode: 'Markdown' 
            }) 
        });
        if (!response.ok) {
            const errorData = await response.json();
            console.error(`Failed to send Telegram message to ${chatId}:`, errorData);
        }
    } catch (error) { 
        console.error(`Failed to send Telegram message to ${chatId}:`, error); 
    }
};
