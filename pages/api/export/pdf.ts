/**
 * PDF Export API for Vector Sur AI
 * Generates professional PDF documents from conversations
 */

import { NextApiRequest, NextApiResponse } from 'next';
import PDFDocument from 'pdfkit';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface ExportRequest {
    title?: string;
    messages: Message[];
    model?: string;
    department?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { title, messages, model, department } = req.body as ExportRequest;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages array is required' });
        }

        // Create PDF document
        const doc = new PDFDocument({
            size: 'A4',
            margins: { top: 50, bottom: 50, left: 50, right: 50 },
            info: {
                Title: title || 'Conversación Vector Sur AI',
                Author: 'Vector Sur AI',
                Subject: 'Transcripción de conversación',
                Creator: 'Vector Sur AI Enterprise',
            },
        });

        // Set response headers for PDF download
        const filename = `vectorsur_${Date.now()}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Pipe PDF to response
        doc.pipe(res);

        // ===== HEADER =====
        // Brand bar
        doc.rect(0, 0, doc.page.width, 80).fill('#0f172a');

        // Logo text
        doc.fontSize(24)
            .font('Helvetica-Bold')
            .fillColor('#ffffff')
            .text('Vector Sur AI', 50, 25, { continued: false });

        doc.fontSize(10)
            .font('Helvetica')
            .fillColor('#94a3b8')
            .text('Enterprise Knowledge Management', 50, 52);

        // Date and metadata on the right
        const now = new Date();
        const dateStr = now.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

        doc.fontSize(9)
            .fillColor('#94a3b8')
            .text(dateStr, 400, 25, { align: 'right', width: 145 });

        if (model) {
            doc.text(`Modelo: ${model}`, 400, 40, { align: 'right', width: 145 });
        }
        if (department && department !== 'General') {
            doc.text(`Departamento: ${department}`, 400, 55, { align: 'right', width: 145 });
        }

        // Move cursor below header
        doc.y = 100;

        // ===== TITLE =====
        doc.fillColor('#0f172a')
            .fontSize(18)
            .font('Helvetica-Bold')
            .text(title || 'Transcripción de Conversación', { align: 'center' });

        doc.moveDown(1);

        // Divider line
        doc.strokeColor('#e2e8f0')
            .lineWidth(1)
            .moveTo(50, doc.y)
            .lineTo(545, doc.y)
            .stroke();

        doc.moveDown(1);

        // ===== MESSAGES =====
        for (const message of messages) {
            // Skip empty messages
            if (!message.content?.trim()) continue;

            // Clean content (remove RAG sources marker)
            let content = message.content;
            if (content.includes(':::rag-sources:::')) {
                content = content.split(':::rag-sources:::')[0].trim();
            }

            const isUser = message.role === 'user';
            const roleLabel = isUser ? '👤 Usuario' : '🤖 Asistente';
            const bgColor = isUser ? '#f0f9ff' : '#f8fafc';
            const borderColor = isUser ? '#0ea5e9' : '#e2e8f0';

            // Check if we need a new page
            if (doc.y > 700) {
                doc.addPage();
                doc.y = 50;
            }

            // Message box
            const startY = doc.y;

            // Role label
            doc.fontSize(10)
                .font('Helvetica-Bold')
                .fillColor(isUser ? '#0369a1' : '#475569')
                .text(roleLabel, 55);

            doc.moveDown(0.3);

            // Message content
            doc.fontSize(11)
                .font('Helvetica')
                .fillColor('#1e293b')
                .text(content, 55, doc.y, {
                    width: 485,
                    align: 'left',
                    lineGap: 4,
                });

            doc.moveDown(1);

            // Draw left border
            doc.strokeColor(borderColor)
                .lineWidth(3)
                .moveTo(50, startY - 5)
                .lineTo(50, doc.y - 10)
                .stroke();
        }

        // ===== FOOTER =====
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
            doc.switchToPage(i);

            // Footer line
            doc.strokeColor('#e2e8f0')
                .lineWidth(0.5)
                .moveTo(50, 780)
                .lineTo(545, 780)
                .stroke();

            // Footer text
            doc.fontSize(8)
                .font('Helvetica')
                .fillColor('#94a3b8')
                .text(
                    'Generado por Vector Sur AI - Documento confidencial',
                    50,
                    790,
                    { align: 'center', width: 495 }
                );

            doc.text(
                `Página ${i + 1} de ${pageCount}`,
                50,
                790,
                { align: 'right', width: 495 }
            );
        }

        // Finalize PDF
        doc.end();

    } catch (error) {
        console.error('PDF generation error:', error);
        return res.status(500).json({ error: 'Failed to generate PDF', message: (error as Error).message });
    }
}

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb', // Allow larger requests for long conversations
        },
    },
};
