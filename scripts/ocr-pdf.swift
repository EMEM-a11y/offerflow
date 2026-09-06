import AppKit
import Foundation
import PDFKit
import Vision

struct OCRPage: Codable {
    let page: Int
    let width: Double
    let height: Double
    let text: String
}

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data((message + "\n").utf8))
    exit(1)
}

guard CommandLine.arguments.count >= 3 else {
    fail("Usage: ocr-pdf.swift <input.pdf> <output.json> [first-page] [last-page]")
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
guard let document = PDFDocument(url: inputURL) else {
    fail("Unable to open PDF: \(inputURL.path)")
}

let firstPage = max(1, Int(CommandLine.arguments.count > 3 ? CommandLine.arguments[3] : "1") ?? 1)
let requestedLastPage = Int(CommandLine.arguments.count > 4 ? CommandLine.arguments[4] : "\(document.pageCount)") ?? document.pageCount
let lastPage = min(document.pageCount, requestedLastPage)
guard firstPage <= lastPage else {
    fail("Invalid page range: \(firstPage)-\(lastPage)")
}

func render(_ page: PDFPage, targetWidth: CGFloat = 2200) -> CGImage? {
    let bounds = page.bounds(for: .mediaBox)
    let scale = targetWidth / bounds.width
    let targetHeight = max(1, Int((bounds.height * scale).rounded()))
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    guard let context = CGContext(
        data: nil,
        width: Int(targetWidth),
        height: targetHeight,
        bitsPerComponent: 8,
        bytesPerRow: 0,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else { return nil }

    context.setFillColor(NSColor.white.cgColor)
    context.fill(CGRect(x: 0, y: 0, width: targetWidth, height: CGFloat(targetHeight)))
    context.saveGState()
    context.scaleBy(x: scale, y: scale)
    page.draw(with: .mediaBox, to: context)
    context.restoreGState()
    return context.makeImage()
}

func recognize(_ image: CGImage) throws -> String {
    var observations: [VNRecognizedTextObservation] = []
    let request = VNRecognizeTextRequest { request, error in
        if let error { FileHandle.standardError.write(Data(("OCR error: \(error)\n").utf8)) }
        observations = request.results as? [VNRecognizedTextObservation] ?? []
    }
    request.recognitionLevel = .accurate
    request.recognitionLanguages = ["zh-Hans", "en-US"]
    request.usesLanguageCorrection = true
    request.minimumTextHeight = 0.008
    try VNImageRequestHandler(cgImage: image, options: [:]).perform([request])

    let sorted = observations.sorted { lhs, rhs in
        let verticalDelta = abs(lhs.boundingBox.midY - rhs.boundingBox.midY)
        if verticalDelta > 0.012 { return lhs.boundingBox.midY > rhs.boundingBox.midY }
        return lhs.boundingBox.minX < rhs.boundingBox.minX
    }
    return sorted.compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
}

var pages: [OCRPage] = []
for pageNumber in firstPage...lastPage {
    autoreleasepool {
        guard let page = document.page(at: pageNumber - 1), let image = render(page) else {
            fail("Unable to render page \(pageNumber)")
        }
        do {
            let text = try recognize(image)
            pages.append(OCRPage(page: pageNumber, width: Double(image.width), height: Double(image.height), text: text))
            FileHandle.standardError.write(Data(("OCR \(pageNumber)/\(lastPage)\n").utf8))
        } catch {
            fail("Unable to OCR page \(pageNumber): \(error)")
        }
    }
}

let encoder = JSONEncoder()
encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
do {
    let data = try encoder.encode(pages)
    try FileManager.default.createDirectory(at: outputURL.deletingLastPathComponent(), withIntermediateDirectories: true)
    try data.write(to: outputURL, options: .atomic)
} catch {
    fail("Unable to write OCR output: \(error)")
}
