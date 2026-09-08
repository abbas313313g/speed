
"use server";

export const sendTelegramMessage = async (chatId: string, message: string) => {
    // استخدام التوكن الذي زودنا به المستخدم
    const botToken = "8905247257:AAHz8czkJBooD67PWIfaxrbbAcLd516hU4k";
    
    if (!chatId) {
        console.warn("Telegram Chat ID is missing. Skipping message.");
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
